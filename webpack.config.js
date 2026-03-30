const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");

const pages = [
  "login",
  "dashboard",
  "productos",
  "categorias",
  "proveedores",
  "sucursales",
  "inventario",
  "movimientos",
  "ventas",
  "ordenes",
  "usuarios",
];

const htmlPlugins = pages.map(
  (page) =>
    new HtmlWebpackPlugin({
      template: `./src/html/${page}.html`,
      filename: `${page}.html`,
      chunks: [page, "vendor"],
      inject: "body",
    }),
);

const entries = {};
pages.forEach((page) => {
  entries[page] = `./src/js/pages/${page}.js`;
});

module.exports = (env, argv) => {
  const isDev = argv.mode === "development";

  return {
    entry: entries,

    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "js/[name].[contenthash].js",
      clean: true,
    },

    optimization: {
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            chunks: "all",
          },
        },
      },
    },

    module: {
      rules: [
        {
          test: /\.(scss|css)$/,
          use: [
            isDev ? "style-loader" : MiniCssExtractPlugin.loader,
            "css-loader",
            {
              loader: "sass-loader",
              options: {
                sassOptions: {
                  // Silencia los warnings de deprecación de Bootstrap 5.3
                  // con Dart Sass 1.8x — no afecta el output generado
                  silenceDeprecations: [
                    "import",
                    "global-builtin",
                    "color-functions",
                    "if-function",
                  ],
                },
              },
            },
          ],
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf|svg)$/i,
          type: "asset/resource",
          generator: { filename: "fonts/[name][ext]" },
        },
        {
          test: /\.(png|jpg|jpeg|gif|ico)$/i,
          type: "asset/resource",
          generator: { filename: "img/[name][ext]" },
        },
      ],
    },

    plugins: [
      new webpack.DefinePlugin({
        "process.env.USERS_API_URL": JSON.stringify(process.env.USERS_API_URL),
        "process.env.INV_API_URL": JSON.stringify(process.env.INV_API_URL),
      }),

      new MiniCssExtractPlugin({
        filename: "css/[name].[contenthash].css",
      }),

      ...htmlPlugins,
    ],

    devServer: {
      static: path.resolve(__dirname, "dist"),
      port: 3000,
      hot: true,
      open: true,
      historyApiFallback: { index: "/login.html" },

      proxy: [
        {
          context: ["/inv"],
          target: "http://localhost:8081",
          pathRewrite: { "^/inv": "" },
        },
        {
          context: ["/users"],
          target: "http://localhost:8080",
          pathRewrite: { "^/users": "" },
        },
      ],
    },

    devtool: isDev ? "eval-source-map" : false,

    resolve: {
      extensions: [".js"],
      alias: {
        "@api": path.resolve(__dirname, "src/js/api"),
        "@components": path.resolve(__dirname, "src/js/components"),
        "@utils": path.resolve(__dirname, "src/js/utils"),
        "@pages": path.resolve(__dirname, "src/js/pages"),
      },
    },
  };
};
