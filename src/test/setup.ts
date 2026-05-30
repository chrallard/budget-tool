import "@testing-library/jest-dom/vitest";

if (typeof File !== "undefined" && typeof File.prototype.arrayBuffer !== "function") {
  Object.defineProperty(File.prototype, "arrayBuffer", {
    configurable: true,
    value: function arrayBuffer(this: File): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (result instanceof ArrayBuffer) {
            resolve(result);
            return;
          }

          reject(new Error("Unable to read file."));
        };
        reader.onerror = () => reject(new Error("Unable to read file."));
        reader["readAsArrayBuffer"](this);
      });
    },
  });
}
