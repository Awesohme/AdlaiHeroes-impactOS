declare module "naija-state-local-government" {
  const naija: {
    states?: () => string[];
    lgas?: (state: string) => { lgas?: string[] } | string[];
  };
  export default naija;
}
