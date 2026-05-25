declare module "@env" {
  export const EXPO_PUBLIC_DATABASE_URL: string;
}

declare module "*.sql" {
  const content: string;
  export default content;
}
