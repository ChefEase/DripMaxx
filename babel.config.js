module.exports = function (api) {
  api.cache(true);
  console.log("[babel.config] Babel configuration loaded"); // log

  return {
    presets: ["babel-preset-expo"],
    plugins: ["expo-router/babel"],
  };
};

