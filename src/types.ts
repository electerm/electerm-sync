interface ConfigBase {
  url?: string
  headers?: Object
}

export type Config = Record<string, any | ConfigBase>
