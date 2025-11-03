import { JSX as PreactJSX, type ComponentChildren } from 'preact';

declare global {
  namespace JSX {
    type Element = PreactJSX.Element;
    interface ElementClass extends PreactJSX.ElementClass {}
    interface ElementAttributesProperty extends PreactJSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends PreactJSX.ElementChildrenAttribute {}
    interface IntrinsicElements extends PreactJSX.IntrinsicElements {}
  }
}

declare module 'react' {
  export * from 'preact/compat';
  const defaultExport: typeof import('preact/compat').default;
  export default defaultExport;
  export type PropsWithChildren<P = unknown> = P & { children?: ComponentChildren | undefined };
  export type MouseEvent<T = Element> = PreactJSX.TargetedEvent<T, globalThis.MouseEvent>;
  export type ChangeEvent<T = Element> = PreactJSX.TargetedEvent<T, Event>;
  export type FormEvent<T = Element> = PreactJSX.TargetedEvent<T, Event>;
}

declare module 'react-dom' {
  export * from 'preact/compat';
  const defaultExport: typeof import('preact/compat').default;
  export default defaultExport;
}

declare module 'react/jsx-runtime' {
  export * from 'preact/jsx-runtime';
}
