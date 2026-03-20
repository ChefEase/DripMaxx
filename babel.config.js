module.exports = function (api) {
  api.cache(true);
  console.log("[babel.config] Babel configuration loaded");

  return {
    presets: ["babel-preset-expo"],
  };
};
