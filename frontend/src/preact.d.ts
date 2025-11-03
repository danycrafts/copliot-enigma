import { JSX as PreactJSX } from 'preact';

declare global {
  namespace JSX {
    interface IntrinsicElements extends PreactJSX.IntrinsicElements {}
  }
}

declare module 'react' {
  export * from 'preact/compat';
  const defaultExport: typeof import('preact/compat').default;
  export default defaultExport;
}

declare module 'react-dom' {
  export * from 'preact/compat';
  const defaultExport: typeof import('preact/compat').default;
  export default defaultExport;
}

declare module 'react/jsx-runtime' {
  export * from 'preact/jsx-runtime';
}
