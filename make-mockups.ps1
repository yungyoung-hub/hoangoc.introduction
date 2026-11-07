# Generates product mockups for "Packaging & Event Assets" into assets/mockups/ and writes assets/mockups.js.
# Run after changing packaging files:  powershell -ExecutionPolicy Bypass -File .\make-mockups.ps1
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class Mock {
  static string Src, Out, SectionName;
  static Dictionary<string, List<string>> map = new Dictionary<string, List<string>>();
  static HashSet<string> used = new HashSet<string>();

  static void HQ(Graphics g) {
    g.SmoothingMode = SmoothingMode.AntiAlias;
    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
    g.CompositingQuality = CompositingQuality.HighQuality;
  }

  static string Find(string needle) {
    foreach (var f in Directory.GetFiles(Src)) {
      var n = Path.GetFileName(f).Normalize(NormalizationForm.FormC).ToLowerInvariant();
      var ext = Path.GetExtension(n);
      if (ext != ".png" && ext != ".jpg" && ext != ".jpeg") continue; // images only (skip PDFs etc.)
      if (n.Contains(needle.Normalize(NormalizationForm.FormC))) return f;
    }
    return null;
  }

  static Bitmap Load(string path, int maxSide) {
    using (var src = Image.FromFile(path)) {
      float s = Math.Min(1f, (float)maxSide / Math.Max(src.Width, src.Height));
      int w = Math.Max(1, (int)(src.Width * s)), h = Math.Max(1, (int)(src.Height * s));
      var b = new Bitmap(w, h, PixelFormat.Format32bppPArgb);
      using (var g = Graphics.FromImage(b)) { HQ(g); g.DrawImage(src, 0, 0, w, h); }
      return b;
    }
  }

  static Bitmap Crop(Bitmap full, float x, float y, float w, float h, int maxSide) {
    var r = new Rectangle((int)(x * full.Width), (int)(y * full.Height), (int)(w * full.Width), (int)(h * full.Height));
    float s = Math.Min(1f, (float)maxSide / Math.Max(r.Width, r.Height));
    var b = new Bitmap(Math.Max(1, (int)(r.Width * s)), Math.Max(1, (int)(r.Height * s)), PixelFormat.Format32bppPArgb);
    using (var g = Graphics.FromImage(b)) { HQ(g); g.DrawImage(full, new Rectangle(0, 0, b.Width, b.Height), r, GraphicsUnit.Pixel); }
    return b;
  }

  static Bitmap Canvas(int w, int h, Color a, Color b) {
    var bmp = new Bitmap(w, h, PixelFormat.Format32bppPArgb);
    using (var g = Graphics.FromImage(bmp)) {
      HQ(g);
      using (var br = new LinearGradientBrush(new Rectangle(0, 0, w, h), a, b, 65f)) g.FillRectangle(br, 0, 0, w, h);
      using (var path = new GraphicsPath()) {
        path.AddEllipse(-w * 0.3f, -h * 0.35f, w * 1.6f, h * 1.7f);
        using (var pb = new PathGradientBrush(path)) {
          pb.CenterColor = Color.FromArgb(0, 0, 0, 0);
          pb.SurroundColors = new Color[] { Color.FromArgb(70, 0, 0, 0) };
          pb.FocusScales = new PointF(0.5f, 0.5f);
          g.FillRectangle(pb, 0, 0, w, h);
        }
      }
      var rnd = new Random(7);
      using (var dark = new SolidBrush(Color.FromArgb(9, 0, 0, 0)))
      using (var light = new SolidBrush(Color.FromArgb(12, 255, 255, 255))) {
        for (int i = 0; i < w * h / 30; i++) g.FillRectangle(rnd.Next(2) == 0 ? dark : light, rnd.Next(w), rnd.Next(h), 1, 1);
      }
    }
    return bmp;
  }

  static Bitmap Blur(Bitmap s) {
    var t = new Bitmap(Math.Max(1, s.Width / 3), Math.Max(1, s.Height / 3), PixelFormat.Format32bppPArgb);
    using (var g = Graphics.FromImage(t)) { HQ(g); g.DrawImage(s, 0, 0, t.Width, t.Height); }
    var r = new Bitmap(s.Width, s.Height, PixelFormat.Format32bppPArgb);
    using (var g = Graphics.FromImage(r)) { HQ(g); g.DrawImage(t, 0, 0, r.Width, r.Height); }
    t.Dispose();
    return r;
  }

  static Bitmap Silhouette(Bitmap img, int div, float alpha, out float pw, out float ph) {
    int W = Math.Max(2, img.Width / div), H = Math.Max(2, img.Height / div);
    int pad = Math.Max(3, (int)(Math.Max(W, H) * 0.14));
    var s = new Bitmap(W + 2 * pad, H + 2 * pad, PixelFormat.Format32bppPArgb);
    using (var g = Graphics.FromImage(s)) {
      HQ(g);
      var cm = new ColorMatrix(new float[][] {
        new float[] {0,0,0,0,0}, new float[] {0,0,0,0,0}, new float[] {0,0,0,0,0},
        new float[] {0,0,0,alpha,0}, new float[] {0,0,0,0,1} });
      using (var ia = new ImageAttributes()) {
        ia.SetColorMatrix(cm);
        g.DrawImage(img, new Rectangle(pad, pad, W, H), 0, 0, img.Width, img.Height, GraphicsUnit.Pixel, ia);
      }
    }
    var r = Blur(s); s.Dispose();
    pw = (float)pad / W; ph = (float)pad / H;
    return r;
  }

  static void Shadow(Graphics g, Bitmap img, float w, float h, float dx, float dy, int div, float alpha) {
    float pw, ph;
    using (var s = Silhouette(img, div, alpha, out pw, out ph))
      g.DrawImage(s, new RectangleF(-w / 2 - pw * w + dx, -h / 2 - ph * h + dy, w * (1 + 2 * pw), h * (1 + 2 * ph)));
  }

  // Draws img centred at (0, oy) in a frame moved to (px,py) and rotated by angle (degrees).
  static void Place(Graphics g, Bitmap img, float px, float py, float angle, float w, float oy, float lift, bool sheen, bool fold) {
    float h = w * img.Height / img.Width;
    var st = g.Save();
    g.TranslateTransform(px, py); g.RotateTransform(angle); g.TranslateTransform(0, oy);
    double rad = -angle * Math.PI / 180; // keep light from the top in world space
    float sx = (float)(Math.Sin(rad) * lift), sy = (float)(Math.Cos(rad) * lift);
    Shadow(g, img, w, h, sx * 0.9f, sy * 0.9f, 14, 0.42f);
    Shadow(g, img, w, h, sx * 0.15f, sy * 0.15f, 5, 0.32f);
    g.DrawImage(img, new RectangleF(-w / 2, -h / 2, w, h));
    var rect = new RectangleF(-w / 2, -h / 2, w, h);
    if (fold) {
      var r = new RectangleF(-w * 0.07f, -h / 2, w * 0.14f, h);
      using (var br = new LinearGradientBrush(r, Color.Black, Color.White, 0f)) {
        var cb = new ColorBlend();
        cb.Colors = new Color[] { Color.FromArgb(0, 0, 0, 0), Color.FromArgb(55, 0, 0, 0), Color.FromArgb(45, 255, 255, 255), Color.FromArgb(0, 255, 255, 255) };
        cb.Positions = new float[] { 0f, 0.49f, 0.51f, 1f };
        br.InterpolationColors = cb;
        g.FillRectangle(br, r);
      }
    }
    if (sheen) {
      using (var br = new LinearGradientBrush(rect, Color.FromArgb(40, 255, 255, 255), Color.FromArgb(22, 0, 0, 0), 40f)) g.FillRectangle(br, rect);
    }
    g.Restore(st);
  }

  static void ShadowPoly(Graphics g, PointF[] pts, int cw, int ch, float dx, float dy, float alpha, int div) {
    using (var s = new Bitmap(cw / div, ch / div, PixelFormat.Format32bppPArgb)) {
      using (var sg = Graphics.FromImage(s)) {
        HQ(sg);
        var p2 = new PointF[pts.Length];
        for (int i = 0; i < pts.Length; i++) p2[i] = new PointF((pts[i].X + dx) / div, (pts[i].Y + dy) / div);
        using (var br = new SolidBrush(Color.FromArgb((int)(alpha * 255), 0, 0, 0))) sg.FillPolygon(br, p2);
      }
      using (var b1 = Blur(s)) using (var b2 = Blur(b1)) g.DrawImage(b2, 0, 0, cw, ch);
    }
  }

  static PointF P(PointF o, float x, PointF ex, float y, PointF ed, float z, float s) {
    return new PointF(o.X + x * ex.X + y * ed.X, o.Y + x * ex.Y + y * ed.Y - z * s);
  }

  static void Tint(Graphics g, PointF[] quad, Color c) {
    using (var br = new SolidBrush(c)) g.FillPolygon(br, quad);
  }

  static void Save(Bitmap b, string name, params string[] sources) {
    var enc = Array.Find(ImageCodecInfo.GetImageEncoders(), e => e.MimeType == "image/jpeg");
    var ps = new EncoderParameters(1); ps.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 88L);
    b.Save(Path.Combine(Out, name + ".jpg"), enc, ps);
    b.Dispose();
    foreach (var s in sources) {
      if (s == null) continue;
      used.Add(s);
      var key = SectionName + "/" + Path.GetFileName(s);
      if (!map.ContainsKey(key)) map[key] = new List<string>();
      map[key].Add("assets/mockups/" + name + ".jpg");
    }
  }

  /* ---------------- Scenes ---------------- */

  static void LiXiFan() {
    var files = new List<string>();
    for (int i = 1; i <= 5; i++) { var f = Find("2025_printed version_v1.0-0" + i); if (f != null) files.Add(f); }
    if (files.Count == 0) return;
    var c = Canvas(1600, 1200, Color.FromArgb(242, 231, 214), Color.FromArgb(222, 205, 182));
    using (var g = Graphics.FromImage(c)) {
      HQ(g);
      float[] tilt = { -6f, 5f, -3f, 7f, -5f, 4f };
      float spacing = Math.Min(275f, 1300f / Math.Max(1, files.Count)), x0 = 800 - spacing * (files.Count - 1) / 2;
      for (int i = 0; i < files.Count; i++) using (var img = Load(files[i], 1200))
        Place(g, img, x0 + i * spacing, 600 + (i % 2 == 0 ? -45 : 45), tilt[i % tilt.Length], 300, 0, 24, false, false);
    }
    Save(c, "lixi-2025-envelopes", files.ToArray());
  }

  static void LiXiCards() {
    var a = Find("2025_printed version_v1.0-07");
    var b = Find("2025_printed version_v1.0-06");
    if (a == null && b == null) return;
    var c = Canvas(1600, 1200, Color.FromArgb(236, 229, 216), Color.FromArgb(214, 202, 184));
    using (var g = Graphics.FromImage(c)) {
      HQ(g);
      if (a != null) using (var img = Load(a, 1800)) Place(g, img, 660, 520, -8, 840, 0, 30, true, false);
      if (b != null) using (var img = Load(b, 1800)) Place(g, img, 950, 690, 6, 840, 0, 36, true, false);
    }
    Save(c, "lixi-2025-cards", b, a);
  }

  static void GiftBox() {
    var box = Find("ny gift_box");
    var sticker = Find("ny gift_sticker");
    if (box == null) return;
    var c = Canvas(1600, 1200, Color.FromArgb(241, 230, 216), Color.FromArgb(220, 203, 182));
    using (var full = Load(box, 20000))
    using (var g = Graphics.FromImage(c)) {
      HQ(g);
      // Dieline regions (fractions of the full sheet): lid, front wall, side wall
      var lid = Crop(full, 343f / 2000, 185f / 1192, 340f / 2000, 280f / 1192, 1400);
      lid.RotateFlip(RotateFlipType.Rotate180FlipNone);
      var front = Crop(full, 343f / 2000, 900f / 1192, 340f / 2000, 145f / 1192, 1400);
      var side = Crop(full, 684f / 2000, 616f / 1192, 145f / 1192 * 1192f / 2000, 284f / 1192, 1400);
      side.RotateFlip(RotateFlipType.Rotate90FlipNone);

      float s = 22f, W = 30, D = 25, H = 13;
      var ex = new PointF(0.88f * s, 0.30f * s);
      var ed = new PointF(0.52f * s, -0.28f * s);
      var o = new PointF(190, 830);
      PointF b00 = P(o, 0, ex, 0, ed, 0, s), bW0 = P(o, W, ex, 0, ed, 0, s), bWD = P(o, W, ex, D, ed, 0, s), b0D = P(o, 0, ex, D, ed, 0, s);
      PointF t00 = P(o, 0, ex, 0, ed, H, s), tW0 = P(o, W, ex, 0, ed, H, s), tWD = P(o, W, ex, D, ed, H, s), t0D = P(o, 0, ex, D, ed, H, s);

      ShadowPoly(g, new PointF[] { b00, bW0, bWD, b0D }, 1600, 1200, 26, 22, 0.55f, 8);
      ShadowPoly(g, new PointF[] { b00, bW0, bWD, b0D }, 1600, 1200, 4, 6, 0.45f, 3);

      g.DrawImage(front, new PointF[] { t00, tW0, b00 });
      Tint(g, new PointF[] { t00, tW0, bW0, b00 }, Color.FromArgb(28, 0, 0, 0));
      g.DrawImage(side, new PointF[] { tW0, tWD, bW0 });
      Tint(g, new PointF[] { tW0, tWD, bWD, bW0 }, Color.FromArgb(85, 0, 0, 0));
      g.DrawImage(lid, new PointF[] { t0D, tWD, t00 });
      using (var br = new LinearGradientBrush(new RectangleF(t00.X, tWD.Y, tW0.X - t00.X + 300, tW0.Y - tWD.Y + 10), Color.FromArgb(40, 255, 255, 255), Color.FromArgb(0, 255, 255, 255), 30f))
        g.FillPolygon(br, new PointF[] { t00, tW0, tWD, t0D });
      using (var pen = new Pen(Color.FromArgb(70, 255, 255, 255), 1.6f)) { g.DrawLine(pen, t00, tW0); g.DrawLine(pen, tW0, tWD); }
      lid.Dispose(); front.Dispose(); side.Dispose();

      if (sticker != null) using (var img = Load(sticker, 1400)) Place(g, img, 1300, 640, 8, 380, 0, 22, true, false);
    }
    Save(c, "gift-box", box, sticker);
  }

  static void Thiep2023() {
    var a = Find("2023_v1.1-01"); var b = Find("2023_v1.1-02"); var d = Find("2023_v1.1-03");
    if (a == null && b == null && d == null) return;
    var c = Canvas(1600, 1200, Color.FromArgb(230, 226, 238), Color.FromArgb(203, 196, 220));
    using (var g = Graphics.FromImage(c)) {
      HQ(g);
      if (b != null) using (var img = Load(b, 2400)) Place(g, img, 900, 410, -6, 1100, 0, 26, true, false);
      if (d != null) using (var img = Load(d, 2400)) Place(g, img, 820, 790, 4, 1100, 0, 30, true, false);
      if (a != null) using (var img = Load(a, 1600)) Place(g, img, 420, 610, -11, 560, 0, 40, true, false);
    }
    Save(c, "tet-2023-cards", a, b, d);
  }

  static void Card2024() {
    var card = Find("card 2024"); var env = Find("envelop");
    if (card == null && env == null) return;
    var c = Canvas(1600, 1200, Color.FromArgb(243, 234, 222), Color.FromArgb(226, 210, 192));
    using (var g = Graphics.FromImage(c)) {
      HQ(g);
      if (env != null) using (var img = Load(env, 1600)) Place(g, img, 640, 640, -8, 660, 0, 26, false, false);
      if (card != null) using (var img = Load(card, 1600)) Place(g, img, 960, 500, 7, 760, 0, 40, true, false);
    }
    Save(c, "card-2024", card, env);
  }

  /* ---------- Folding helpers (detect dieline panels from the transparent edges) ---------- */
  static byte[] Alpha(Bitmap b) {
    var d = b.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    var buf = new byte[d.Stride * b.Height];
    System.Runtime.InteropServices.Marshal.Copy(d.Scan0, buf, 0, buf.Length);
    int stride = d.Stride;
    b.UnlockBits(d);
    var a = new byte[b.Width * b.Height];
    for (int y = 0; y < b.Height; y++) for (int x = 0; x < b.Width; x++) a[y * b.Width + x] = buf[y * stride + x * 4 + 3];
    return a;
  }

  static void RowExt(byte[] a, int W, int y, out int l, out int r) {
    l = -1; r = -1;
    for (int x = 0; x < W; x++) if (a[y * W + x] > 128) { if (l < 0) l = x; r = x; }
  }

  static Bitmap Sub(Bitmap src, int x, int y, int w, int h) {
    var b = new Bitmap(Math.Max(1, w), Math.Max(1, h), PixelFormat.Format32bppPArgb);
    using (var g = Graphics.FromImage(b)) { HQ(g); g.DrawImage(src, new Rectangle(0, 0, b.Width, b.Height), new Rectangle(x, y, b.Width, b.Height), GraphicsUnit.Pixel); }
    return b;
  }

  // Lì xì dieline: [back panel | front panel + arched flap on top]. Returns { front, back-with-flap-folded }.
  static Bitmap[] LiXiParts(Bitmap img) {
    int W = img.Width, H = img.Height; var a = Alpha(img);
    int[] L = new int[H], R = new int[H]; int xMin = W, top = -1;
    for (int y = 0; y < H; y++) { RowExt(a, W, y, out L[y], out R[y]); if (L[y] >= 0) { if (top < 0) top = y; if (L[y] < xMin) xMin = L[y]; } }
    int bt = -1, bb = -1;
    for (int y = 0; y < H; y++) if (L[y] >= 0 && L[y] <= xMin + 4) { if (bt < 0) bt = y; bb = y; }
    if (bt < 0 || bt - top < 20) return null;
    int ar = Math.Max(top, bt - 4); int fx0 = L[ar], fx1 = R[ar];
    if (fx0 < xMin + 50 || fx1 - fx0 < 100) return null;
    int bh = bb - bt + 1;
    var front = Sub(img, fx0, bt, fx1 - fx0 + 1, bh);
    var back = Sub(img, xMin, bt, fx0 - xMin, bh);
    var flap = Sub(img, fx0, top, fx1 - fx0 + 1, bt - top);
    flap.RotateFlip(RotateFlipType.RotateNoneFlipY);
    var comp = new Bitmap(back.Width, back.Height, PixelFormat.Format32bppPArgb);
    using (var g = Graphics.FromImage(comp)) {
      HQ(g);
      g.DrawImage(back, 0, 0, back.Width, back.Height);
      float fx = (back.Width - flap.Width) / 2f, pw, ph;
      using (var s = Silhouette(flap, 6, 0.4f, out pw, out ph))
        g.DrawImage(s, new RectangleF(fx - pw * flap.Width, 7 - ph * flap.Height, flap.Width * (1 + 2 * pw), flap.Height * (1 + 2 * ph)));
      g.DrawImage(flap, fx, 0, flap.Width, flap.Height);
    }
    back.Dispose(); flap.Dispose();
    return new Bitmap[] { front, comp };
  }

  // Card envelope dieline: [front pocket on top | full-cover flap below]. Returns { front, back-with-flap-folded }.
  static Bitmap[] EnvelopeParts(Bitmap img) {
    int W = img.Width, H = img.Height; var a = Alpha(img);
    // The pocket (top) spans the full width; the flap (bottom) is inset. Split where the left edge steps in.
    int topL = W;
    for (int y = (int)(H * 0.1); y < (int)(H * 0.4); y++) { int l, r; RowExt(a, W, y, out l, out r); if (l >= 0 && l < topL) topL = l; }
    int split = -1;
    for (int y = (int)(H * 0.2); y < H; y++) { int l, r; RowExt(a, W, y, out l, out r); if (l >= topL + W * 0.025) { split = y; break; } }
    if (split < 0) return null;
    int bx0, bx1; RowExt(a, W, Math.Min(H - 1, split + (int)(H * 0.03)), out bx0, out bx1);
    if (bx0 < 0) return null;
    var front = Sub(img, bx0, 0, bx1 - bx0 + 1, split);
    var flap = Sub(img, bx0, split, bx1 - bx0 + 1, H - split);
    flap.RotateFlip(RotateFlipType.Rotate180FlipNone);
    Color red = flap.GetPixel(flap.Width / 2, flap.Height / 2);
    var comp = new Bitmap(front.Width, front.Height, PixelFormat.Format32bppPArgb);
    using (var g = Graphics.FromImage(comp)) {
      HQ(g);
      var cm = new ColorMatrix(new float[][] {
        new float[] {0,0,0,0,0}, new float[] {0,0,0,0,0}, new float[] {0,0,0,0,0},
        new float[] {0,0,0,1,0}, new float[] {red.R / 255f, red.G / 255f, red.B / 255f, 0, 1} });
      using (var ia = new ImageAttributes()) {
        ia.SetColorMatrix(cm);
        g.DrawImage(front, new Rectangle(0, 0, front.Width, front.Height), 0, 0, front.Width, front.Height, GraphicsUnit.Pixel, ia);
      }
      float fx = (front.Width - flap.Width) / 2f, fy = front.Height - flap.Height, pw, ph;
      using (var s = Silhouette(flap, 6, 0.45f, out pw, out ph))
        g.DrawImage(s, new RectangleF(fx - pw * flap.Width, fy - 6 - ph * flap.Height, flap.Width * (1 + 2 * pw), flap.Height * (1 + 2 * ph)));
      g.DrawImage(flap, fx, fy, flap.Width, flap.Height);
    }
    flap.Dispose();
    return new Bitmap[] { front, comp };
  }

  static void LiXiFolded() {
    var parts = new List<Bitmap[]>(); var srcs = new List<string>();
    for (int i = 1; i <= 5; i++) {
      var f = Find("2025_printed version_v1.0-0" + i); if (f == null) continue;
      using (var img = Load(f, 1600)) { var p = LiXiParts(img); if (p != null) { parts.Add(p); srcs.Add(f); } }
    }
    if (parts.Count == 0) return;
    var c = Canvas(1600, 1200, Color.FromArgb(244, 236, 224), Color.FromArgb(226, 212, 192));
    using (var g = Graphics.FromImage(c)) {
      HQ(g);
      float[] tilt = { -5f, 3f, -2f, 4f, -3f };
      int n = parts.Count; float spacing = Math.Min(290f, 1360f / n), x0 = 800 - spacing * (n - 1) / 2;
      for (int i = 0; i < n; i++) Place(g, parts[i][0], x0 + i * spacing, 610 + (i % 2 == 0 ? -30 : 30), tilt[i % tilt.Length], 250, 0, 26, true, false);
    }
    Save(c, "lixi-2025-folded", srcs.ToArray());

    int k = Math.Min(1, parts.Count - 1);
    var c2 = Canvas(1600, 1200, Color.FromArgb(240, 233, 222), Color.FromArgb(220, 205, 186));
    using (var g = Graphics.FromImage(c2)) {
      HQ(g);
      Place(g, parts[k][1], 590, 620, -7, 400, 0, 28, true, false);
      Place(g, parts[k][0], 1010, 590, 6, 400, 0, 36, true, false);
    }
    Save(c2, "lixi-2025-front-back", srcs[k]);
    foreach (var p in parts) { p[0].Dispose(); p[1].Dispose(); }
  }

  static void EnvelopeFolded() {
    var env = Find("envelop"); var card = Find("card 2024");
    if (env == null) return;
    Bitmap[] parts;
    using (var img = Load(env, 1600)) parts = EnvelopeParts(img);
    if (parts == null) return;
    var c = Canvas(1600, 1200, Color.FromArgb(243, 234, 222), Color.FromArgb(226, 210, 192));
    using (var g = Graphics.FromImage(c)) {
      HQ(g);
      Place(g, parts[1], 500, 640, -8, 600, 0, 28, true, false);
      if (card != null) using (var img = Load(card, 1600)) Place(g, img, 1060, 430, -4, 580, 0, 30, true, false);
      Place(g, parts[0], 1080, 690, 5, 620, 0, 38, true, false);
    }
    Save(c, "card-2024-folded", card, env);
    parts[0].Dispose(); parts[1].Dispose();
  }

  static void MapAdd(string src, string mock) {
    used.Add(src);
    var key = SectionName + "/" + Path.GetFileName(src);
    if (!map.ContainsKey(key)) map[key] = new List<string>();
    map[key].Add("assets/mockups/" + mock);
  }

  static void Brochure() {
    var f = Find("brochure.png"); if (f == null) return;
    var c = Canvas(1600, 1200, Color.FromArgb(228, 233, 239), Color.FromArgb(202, 211, 222));
    using (var g = Graphics.FromImage(c)) {
      HQ(g);
      using (var img = Load(f, 2400)) Place(g, img, 800, 590, -5, 1220, 0, 34, true, true);
    }
    Save(c, "brochure", f);
  }

  static void Standees() {
    var files = new List<string>();
    for (int i = 1; i <= 9; i++) { var f = Find("standee " + i); if (f != null) files.Add(f); }
    if (files.Count == 0) return;
    int Wc = 1600, Hc = 1200; float floorY = 900;
    var c = new Bitmap(Wc, Hc, PixelFormat.Format32bppPArgb);
    using (var g = Graphics.FromImage(c)) {
      HQ(g);
      using (var br = new LinearGradientBrush(new RectangleF(0, 0, Wc, floorY), Color.FromArgb(244, 243, 239), Color.FromArgb(222, 220, 213), 90f)) g.FillRectangle(br, 0, 0, Wc, floorY);
      using (var br = new LinearGradientBrush(new RectangleF(0, floorY, Wc, Hc - floorY), Color.FromArgb(206, 200, 190), Color.FromArgb(182, 175, 163), 90f)) g.FillRectangle(br, 0, floorY, Wc, Hc - floorY);
      using (var br = new LinearGradientBrush(new RectangleF(0, floorY - 40, Wc, 40), Color.FromArgb(0, 0, 0, 0), Color.FromArgb(30, 0, 0, 0), 90f)) g.FillRectangle(br, 0, floorY - 40, Wc, 40);

      float hImg = 700, gap = Wc / (files.Count + 1f);
      for (int i = 0; i < files.Count; i++) using (var img = Load(files[i], 1600)) {
        float w = hImg * img.Width / img.Height, cx = gap * (i + 1), bottom = floorY + 40, top = bottom - 18 - hImg;
        // wall cast shadow
        var st = g.Save(); g.TranslateTransform(cx, top + hImg / 2);
        Shadow(g, img, w, hImg, 38, -6, 10, 0.22f);
        g.Restore(st);
        // floor contact shadow
        using (var path = new GraphicsPath()) {
          var er = new RectangleF(cx - w * 0.85f, bottom - 14, w * 1.7f, 40);
          path.AddEllipse(er);
          using (var pb = new PathGradientBrush(path)) {
            pb.CenterColor = Color.FromArgb(120, 0, 0, 0); pb.SurroundColors = new Color[] { Color.FromArgb(0, 0, 0, 0) };
            g.FillEllipse(pb, er);
          }
        }
        var rect = new RectangleF(cx - w / 2, top, w, hImg);
        g.DrawImage(img, rect);
        using (var br = new LinearGradientBrush(rect, Color.FromArgb(30, 255, 255, 255), Color.FromArgb(20, 0, 0, 0), 20f)) g.FillRectangle(br, rect);
        using (var br = new SolidBrush(Color.FromArgb(44, 44, 46))) g.FillRectangle(br, cx - w / 2 - 14, bottom - 18, w + 28, 18);
        using (var br = new SolidBrush(Color.FromArgb(90, 90, 94))) g.FillRectangle(br, cx - w / 2 - 14, bottom - 18, w + 28, 3);
      }
    }
    Save(c, "standees", files.ToArray());
  }

  static void Booth() {
    var f = Find("mma booth"); if (f == null) return;
    // 3D renders from booth-studio.html take priority over a flat board shot
    var renders = Directory.GetFiles(Out, "booth-3d-*.jpg");
    Array.Sort(renders);
    if (renders.Length > 0) { foreach (var r in renders) MapAdd(f, Path.GetFileName(r)); return; }
    var c = Canvas(1600, 1200, Color.FromArgb(236, 232, 226), Color.FromArgb(214, 206, 195));
    using (var g = Graphics.FromImage(c)) {
      HQ(g);
      using (var img = Load(f, 2000)) Place(g, img, 800, 600, -3, 860, 0, 30, true, false);
    }
    Save(c, "mma-booth", f);
  }

  // Soft-fades the outer edge of a photo so it melts into the backdrop
  static Bitmap Feather(Bitmap src, float frac) {
    int W = src.Width, H = src.Height;
    var b = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(b)) g.DrawImage(src, 0, 0, W, H);
    var d = b.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    var buf = new byte[d.Stride * H];
    System.Runtime.InteropServices.Marshal.Copy(d.Scan0, buf, 0, buf.Length);
    int f = Math.Max(2, (int)(Math.Min(W, H) * frac));
    for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
      float e = Math.Min(Math.Min(x, W - 1 - x), Math.Min(y, H - 1 - y));
      if (e >= f) continue;
      float t = e / f; t = t * t * (3 - 2 * t);
      int i = y * d.Stride + x * 4 + 3; buf[i] = (byte)(buf[i] * t);
    }
    System.Runtime.InteropServices.Marshal.Copy(buf, 0, d.Scan0, buf.Length);
    b.UnlockBits(d);
    return b;
  }

  static void Present(Bitmap crop, string name, string src) { Present(crop, name, src, 0.07f); }
  static void Present(Bitmap crop, string name, string src, float feather) {
    Color a = crop.GetPixel(2, 2), b = crop.GetPixel(crop.Width - 3, crop.Height - 3);
    var c = Canvas(1600, 1200, a, b);
    float s = Math.Min(2.6f, Math.Min(1400f / crop.Width, 1000f / crop.Height));
    float w = crop.Width * s, h = crop.Height * s;
    using (var g = Graphics.FromImage(c)) using (var fe = Feather(crop, feather)) {
      HQ(g);
      g.DrawImage(fe, new RectangleF((1600 - w) / 2, (1200 - h) / 2, w, h));
    }
    Save(c, name, src);
  }

  // Goat (Year of the Goat) gift set: the source is a presentation screenshot that already holds photo mockups.
  // Crop each product shot (dropping annotation lines/labels) and present it full-frame.
  static void GoatGift() {
    // the "quà tết-0N" dielines are shown as originals after the mockups (no flat-lay of their own)
    for (int i = 1; i <= 9; i++) { var q = Find("qu" + (char)0x00E0 + " t" + (char)0x1EBF + "t-0" + i); if (q != null) used.Add(q); }
    var f = Find("file explorer");
    var anchor = f ?? Find("qu" + (char)0x00E0 + " t" + (char)0x1EBF + "t-02");
    if (anchor == null) return;
    // 3D renders from gift-studio.html (built from the dielines) come first
    var renders = Directory.GetFiles(Out, "goat-3d-*.jpg");
    Array.Sort(renders);
    foreach (var r in renders) MapAdd(anchor, Path.GetFileName(r));
    if (f == null) return; // photo crops only when the presentation screenshot is present
    using (var full = Load(f, 4000)) {
      float W = 553f, H = 599f;
      using (var box = Crop(full, 48 / W, 22 / H, 489 / W, 326 / H, 4000)) Present(box, "goat-gift-box", f, 0.025f);
      using (var card = Crop(full, 108 / W, 386 / H, 342 / W, 161 / H, 4000)) Present(card, "goat-gift-card", f);
    }
  }

  // Map renders made by event-studio.html: <prefix>-3d-*.jpg → the source file matching `needle`
  static void Renders(string needle, string prefix) {
    var f = Find(needle); if (f == null) return;
    var renders = Directory.GetFiles(Out, prefix + "-3d-*.jpg");
    Array.Sort(renders);
    foreach (var r in renders) MapAdd(f, Path.GetFileName(r));
  }
  static void EventRenders() { Renders("backdrop", "event"); Renders("banner lcd", "lcd"); }

  static void Fallbacks() {
    int n = 0;
    foreach (var f in Directory.GetFiles(Src)) {
      if (used.Contains(f)) continue;
      var ext = Path.GetExtension(f).ToLowerInvariant();
      if (ext != ".png" && ext != ".jpg" && ext != ".jpeg") continue;
      var c = Canvas(1600, 1200, Color.FromArgb(238, 234, 228), Color.FromArgb(214, 207, 197));
      using (var g = Graphics.FromImage(c)) using (var img = Load(f, 2400)) {
        HQ(g);
        float w = Math.Min(1100f, 860f * img.Width / img.Height);
        Place(g, img, 800, 600, -4, w, 0, 32, true, false);
      }
      Save(c, "item-" + (++n), f);
    }
  }

  public static string Run(string root, string section) {
    SectionName = section;
    Src = Path.Combine(root, section);
    Out = Path.Combine(root, "assets", "mockups");
    Directory.CreateDirectory(Out);
    foreach (var old in Directory.GetFiles(Out, "*.jpg")) if (!Path.GetFileName(old).Contains("-3d-")) File.Delete(old); // keep 3D studio renders
    var log = new StringBuilder();
    Action[] scenes = { LiXiFolded, LiXiFan, LiXiCards, GiftBox, Thiep2023, EnvelopeFolded, Card2024, Brochure, Standees, Booth, GoatGift, EventRenders, Fallbacks };
    foreach (var sc in scenes) {
      try { sc(); GC.Collect(); GC.WaitForPendingFinalizers(); log.AppendLine("ok   " + sc.Method.Name); }
      catch (Exception e) { log.AppendLine("FAIL " + sc.Method.Name + ": " + e.Message); }
    }
    var js = new StringBuilder("window.MOCKUPS = {\n");
    foreach (var kv in map) {
      js.Append("  \"" + kv.Key.Replace("\\", "/").Replace("\"", "\\\"") + "\": [");
      for (int i = 0; i < kv.Value.Count; i++) js.Append((i > 0 ? ", " : "") + "\"" + kv.Value[i] + "\"");
      js.Append("],\n");
    }
    js.Append("};\n");
    File.WriteAllText(Path.Combine(root, "assets", "mockups.js"), js.ToString(), new UTF8Encoding(false));
    return log.ToString();
  }
}
'@
[Mock]::Run($PSScriptRoot, 'Packaging & Event Assets')
