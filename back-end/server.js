import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory storage for uploads; no files are written to disk in this stub.
const upload = multer({ storage: multer.memoryStorage() });

// Simple health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Stub endpoint for converting a user-uploaded video to a GIF.
// Matches the contract documented in back-end/readme.txt.
app.post("/api/convert/gif", upload.single("video"), (req, res) => {
  const file = req.file;

  // Basic validation: ensure a file was uploaded.
  if (!file) {
    return res.status(400).json({
      error: "No video file uploaded",
      code: "NO_FILE"
    });
  }

  const { originalname, mimetype, size } = file;

  // Basic validation: ensure the uploaded file looks like a video.
  if (!mimetype || !mimetype.startsWith("video/")) {
    return res.status(400).json({
      error: "Only video files are supported",
      code: "INVALID_TYPE"
    });
  }

  // TODO: Replace this stub with real video-to-GIF conversion.
  // For now, we just return a fake but correctly-shaped media object.
  const id = Date.now().toString();
  const fakeGifUrl = `/fake-gifs/${encodeURIComponent(originalname)}.gif`;

  res.json({
    id,
    type: "gif",
    url: fakeGifUrl,
    // Optional metadata fields; real implementation can compute these.
    duration: null,
    width: null,
    height: null,
    size
  });
});

app.listen(port, () => {
  console.log(`Back-end server listening on http://localhost:${port}`);
});
