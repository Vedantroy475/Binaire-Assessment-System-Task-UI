/**
 * Global declarations.
 *
 * `blessed` and the blessed-contrib factory instance are attached to the Node
 * global object by the bootstrap (src/index.ts) so every component module can
 * reference them without an import cycle. These declarations keep TypeScript
 * happy across the UI layer. Each component file also declares its own local
 * ambient `const blessed` for direct use.
 */
declare global {
  // eslint-disable-next-line no-var
  var blessed: any;
  // eslint-disable-next-line no-var
  var contrib: any;
  // eslint-disable-next-line no-var
  var screen: any;
}

export {};

