/// <reference types="astro/client" />
declare module '*?worker&inline' {
  const W: { new (): Worker };
  export default W;
}
