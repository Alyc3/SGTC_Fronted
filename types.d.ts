declare module "@env" {
  export const DATABASE_URL: string;
}

declare module "*.sql" {
  const content: string;
  export default content;
}
