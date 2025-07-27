// types/citation-js-core.d.ts

declare module '@citation-js/core' {
  export class Cite {
    constructor(data: string | object | any);

    format(
      type: string,
      options?: {
        format?: string;
        template?: string;
        lang?: string;
      }
    ): string;
  }
}