export interface Config {
  beamWidth: number;
  numSimulations: number;
  cacheSize: number;
  maxDepth: number;
  defaultStrategy: string;
}

export const DEFAULT_CONFIG: Config = {
  beamWidth: 3,
  numSimulations: 50,
  cacheSize: 1000,
  maxDepth: 10,
  defaultStrategy: 'beam_search'
};
