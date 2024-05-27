module.exports = {
  presets: ["@babel/preset-env", "@babel/preset-typescript"],
  plugins: [
    [
      "module-resolver",
      {
        extensions: [".js", ".ts", ".json"],
      },
    ],
  ],
};
