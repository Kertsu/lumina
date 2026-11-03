import AppKit
import CoreText

let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
let appRoot = root.deletingLastPathComponent()
let width: CGFloat = 720
let height: CGFloat = 460
let scale: CGFloat = 2
func color(_ hex: UInt32) -> NSColor {
  NSColor(
    srgbRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255,
    blue: CGFloat(hex & 255) / 255, alpha: 1)
}
func point(_ x: CGFloat, _ y: CGFloat) -> NSPoint { NSPoint(x: x, y: height - y) }
func text(
  _ value: String, x: CGFloat, y: CGFloat, w: CGFloat, size: CGFloat, weight: NSFont.Weight,
  ink: NSColor, centered: Bool = false
) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = centered ? .center : .left
  (value as NSString).draw(
    in: NSRect(x: x, y: height - y - size * 1.5, width: w, height: size * 1.5),
    withAttributes: [
      .font: NSFont.systemFont(ofSize: size, weight: weight), .foregroundColor: ink,
      .paragraphStyle: paragraph,
    ])
}
let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: Int(width * scale), pixelsHigh: Int(height * scale),
  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
  bytesPerRow: 0, bitsPerPixel: 0)!
let context = NSGraphicsContext(bitmapImageRep: bitmap)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
context.cgContext.scaleBy(x: scale, y: scale)
color(0xf1f4f7).setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()
// Asymmetric blue sweeps rise toward Applications; footer stays quiet.
let far = NSBezierPath()
far.move(to: point(0, 306))
far.curve(to: point(720, 217), controlPoint1: point(212, 390), controlPoint2: point(454, 144))
far.line(to: point(720, 460))
far.line(to: point(0, 460))
far.close()
color(0xe2eaf2).setFill()
far.fill()
let near = NSBezierPath()
near.move(to: point(0, 375))
near.curve(to: point(720, 280), controlPoint1: point(225, 420), controlPoint2: point(505, 220))
near.line(to: point(720, 460))
near.line(to: point(0, 460))
near.close()
color(0xd6e3ee).setFill()
near.fill()
let paper = NSBezierPath()
paper.move(to: point(0, 373))
paper.curve(to: point(720, 332), controlPoint1: point(230, 318), controlPoint2: point(460, 404))
paper.line(to: point(720, 460))
paper.line(to: point(0, 460))
paper.close()
color(0xf1f4f7).setFill()
paper.fill()
let icon = NSImage(contentsOf: appRoot.appendingPathComponent("icons/icon.png"))!
icon.draw(in: NSRect(x: 40, y: height - 30 - 25, width: 25, height: 25))
// Center actual glyph ink against the mark, rather than aligning text boxes.
let brand = NSAttributedString(
  string: "Lumina",
  attributes: [
    .font: NSFont.systemFont(ofSize: 17, weight: .semibold), .foregroundColor: color(0x354b61),
  ])
let brandLine = CTLineCreateWithAttributedString(brand)
let brandInk = CTLineGetBoundsWithOptions(brandLine, .useGlyphPathBounds)
context.cgContext.textMatrix = .identity
context.cgContext.textPosition = CGPoint(x: 73, y: height - 42.5 - brandInk.midY)
CTLineDraw(brandLine, context.cgContext)
text(
  "Drag Lumina into Applications.", x: 32, y: 105, w: 656, size: 28, weight: .semibold,
  ink: color(0x283c50), centered: true)
let arrow = NSBezierPath()
arrow.move(to: point(302, 248))
arrow.curve(to: point(416, 247), controlPoint1: point(345, 220), controlPoint2: point(379, 222))
arrow.move(to: point(401, 227))
arrow.line(to: point(416, 247))
arrow.line(to: point(391, 251))
arrow.lineWidth = 2.6
arrow.lineCapStyle = .round
arrow.lineJoinStyle = .round
color(0x58738d).setStroke()
arrow.stroke()
text(
  "Once copied, open Lumina from Applications.", x: 32, y: 363, w: 656, size: 14, weight: .regular,
  ink: color(0x53667a), centered: true)
NSGraphicsContext.restoreGraphicsState()
bitmap.size = NSSize(width: width, height: height)
try bitmap.representation(using: .png, properties: [:])!.write(
  to: root.appendingPathComponent("background.png"))
print("Rendered 720 × 460 installer background at 2×.")
