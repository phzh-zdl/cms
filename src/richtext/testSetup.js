// Nur fuer Tests: jsdom kennt einige Layout-APIs nicht, die ProseMirror aufruft.
const rect = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON() {} };
const noRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} });

export function stubLayoutApis() {
  Range.prototype.getBoundingClientRect = () => rect;
  Range.prototype.getClientRects = noRects;
  Element.prototype.getClientRects = noRects;
}
