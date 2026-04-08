module.exports = function (api) {
  api.cache(true);
  return {
    // worklets:false にすることで、babel-preset-expo が
    // 自動で `react-native-worklets/plugin` を読み込むのを止めます。
    presets: [["babel-preset-expo", { worklets: false }]],
  };
};