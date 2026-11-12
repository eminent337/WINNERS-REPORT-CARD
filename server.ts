import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Packer } from 'docx';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';
import { createReportDocxDocument } from './src/utils/exportDocx.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large form submissions for 41-page PDF and ZIP payloads
  app.use(express.urlencoded({ extended: true, limit: '150mb' }));
  app.use(express.json({ limit: '150mb' }));

  // 1. Direct PDF / Binary File Download Endpoint (Content-Disposition: attachment)
  app.post('/api/download-file', (req, res) => {
    try {
      const { filename, mimeType, base64Data } = req.body;
      if (!base64Data) {
        res.status(400).send('Missing file data');
        return;
      }
      const cleanName = String(filename || 'MOCK_2_REPORT.pdf').replace(
        /[^a-zA-Z0-9._()-]/g,
        '_'
      );
      const fileBuffer = Buffer.from(String(base64Data), 'base64');

      res.setHeader('Content-Type', String(mimeType || 'application/pdf'));
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${cleanName}"`
      );
      res.setHeader('Content-Length', String(fileBuffer.length));
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.status(200).send(fileBuffer);
    } catch (err) {
      console.error('Error in /api/download-file:', err);
      res.status(500).send('Failed to generate download');
    }
  });

  // 1b. Direct Print Endpoint (Content-Disposition: inline with embedded PDF AutoPrint)
  app.post('/api/print-pdf', (req, res) => {
    try {
      const { filename, base64Data } = req.body;
      if (!base64Data) {
        res.status(400).send('Missing print PDF data');
        return;
      }
      const cleanName = String(filename || 'MOCK_2_PRINT_REPORT.pdf').replace(
        /[^a-zA-Z0-9._()-]/g,
        '_'
      );
      const fileBuffer = Buffer.from(String(base64Data), 'base64');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${cleanName}"`
      );
      res.setHeader('Content-Length', String(fileBuffer.length));
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.status(200).send(fileBuffer);
    } catch (err) {
      console.error('Error in /api/print-pdf:', err);
      res.status(500).send('Failed to generate print document');
    }
  });

  // 2. Direct 41-Student Folder (.ZIP) Download Endpoint (Content-Disposition: attachment)
  app.post('/api/download-zip', async (req, res) => {
    try {
      const rawPayload = req.body?.payload;
      if (!rawPayload) {
        res.status(400).send('Missing ZIP payload');
        return;
      }
      const parsed = JSON.parse(String(rawPayload));
      const folderName = String(
        parsed.folderName || 'MOCK_2_REPORTS_BASIC_NINE'
      ).replace(/[^a-zA-Z0-9._()-]/g, '_');
      const zipFilename = String(
        parsed.zipFilename || `${folderName}.zip`
      ).replace(/[^a-zA-Z0-9._()-]/g, '_');
      const files = Array.isArray(parsed.files) ? parsed.files : [];

      const zip = new JSZip();
      const folder = zip.folder(folderName);

      for (const item of files) {
        if (item && item.name && item.base64) {
          const cleanItemName = String(item.name).replace(
            /[^a-zA-Z0-9._()-]/g,
            '_'
          );
          folder?.file(cleanItemName, Buffer.from(String(item.base64), 'base64'));
        }
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${zipFilename}"`
      );
      res.setHeader('Content-Length', String(zipBuffer.length));
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.status(200).send(zipBuffer);
    } catch (err) {
      console.error('Error in /api/download-zip:', err);
      res.status(500).send('Failed to generate ZIP download');
    }
  });

  // 3. Direct Word (.docx) Download Endpoint (Content-Disposition: attachment)
  app.post('/api/download-docx', async (req, res) => {
    try {
      const rawPayload = req.body?.payload;
      if (!rawPayload) {
        res.status(400).send('Missing DOCX payload');
        return;
      }
      const parsed = JSON.parse(String(rawPayload));
      const config = parsed.config;
      const students = Array.isArray(parsed.students) ? parsed.students : [];
      const cleanFilename = String(
        parsed.filename || 'MOCK_2_EXAMINATION_REPORT.docx'
      ).replace(/[^a-zA-Z0-9._()-]/g, '_');

      let crestBuffer: Buffer | null = null;
      const crestPath = path.resolve(__dirname, 'public/assets/school_crest.png');
      if (fs.existsSync(crestPath)) {
        crestBuffer = fs.readFileSync(crestPath);
      }

      let headmasterSignatureBuffer: Buffer | null = null;
      const headmasterSigPath = path.resolve(
        __dirname,
        'public/assets/headmaster_signature.png'
      );
      if (fs.existsSync(headmasterSigPath)) {
        headmasterSignatureBuffer = fs.readFileSync(headmasterSigPath);
      }

      let teacherSignatureBuffer: Buffer | null = null;
      const teacherSigPath = path.resolve(
        __dirname,
        'public/assets/teacher_signature.png'
      );
      if (fs.existsSync(teacherSigPath)) {
        teacherSignatureBuffer = fs.readFileSync(teacherSigPath);
      }

      const doc = createReportDocxDocument(
        config,
        students,
        crestBuffer,
        headmasterSignatureBuffer,
        teacherSignatureBuffer
      );
      const docxBuffer = await Packer.toBuffer(doc);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${cleanFilename}"`
      );
      res.setHeader('Content-Length', String(docxBuffer.length));
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.status(200).send(docxBuffer);
    } catch (err) {
      console.error('Error in /api/download-docx:', err);
      res.status(500).send('Failed to generate DOCX download');
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
