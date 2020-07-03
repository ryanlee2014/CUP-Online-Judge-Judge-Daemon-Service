export interface Config {
  registry: string[]
}
declare global {
  namespace NodeJS {
    interface Global {
      config: Config
    }
  }
}
