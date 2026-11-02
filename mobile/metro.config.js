// Metro com acesso à pasta ../shared (tokens, schemas e tipos usados também pelo web).
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "..", "shared");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];

// Pacotes importados por arquivos de ../shared (ex.: zod) vêm sempre de mobile/node_modules.
// No EAS Build só as dependências do app são instaladas; localmente evita misturar versões com o web.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromShared = context.originModulePath.startsWith(sharedRoot);
  const isPackage = !moduleName.startsWith(".") && !path.isAbsolute(moduleName);
  const ctx = fromShared && isPackage ? { ...context, originModulePath: path.join(projectRoot, "package.json") } : context;
  return (resolveRequest ?? context.resolveRequest)(ctx, moduleName, platform);
};

module.exports = config;
