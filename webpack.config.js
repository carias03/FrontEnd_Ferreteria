const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const Dotenv = require("dotenv-webpack");

// =============================================
// Páginas del sistema
// Cada página tiene su propio entry point —
// así webpack solo carga el JS necesario.
// =============================================
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

// Genera un HtmlWebpackPlugin por página
const htmlPlugins = pages.map(
  (page) =>
    new HtmlWebpackPlugin({
      template: `./src/html/${page}.html`,
      filename: `${page}.html`,
      chunks: [page, "vendor"], // cada página carga su chunk + vendor
      inject: "body",
    }),
);

// Entry points — uno por página
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
      clean: true, // limpia /dist antes de cada build
    },

    // =============================================
    // Optimización — separa librerías en un chunk
    // vendor para que el browser las cachee
    // =============================================
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

    // =============================================
    // Loaders
    // =============================================
    module: {
      rules: [
        // SCSS → CSS
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
        // Fuentes e íconos
        {
          test: /\.(woff|woff2|eot|ttf|otf|svg)$/i,
          type: "asset/resource",
          generator: { filename: "fonts/[name][ext]" },
        },
        // Imágenes
        {
          test: /\.(png|jpg|jpeg|gif|ico)$/i,
          type: "asset/resource",
          generator: { filename: "img/[name][ext]" },
        },
      ],
    },

    // =============================================
    // Plugins
    // =============================================
    plugins: [
      // Variables de entorno desde .env
      new Dotenv(),

      // Extrae CSS a archivos separados en producción
      new MiniCssExtractPlugin({
        filename: "css/[name].[contenthash].css",
      }),

      ...htmlPlugins,
    ],

    // =============================================
    // Dev server — proxy para evitar CORS en local
    // =============================================
    devServer: {
      static: path.resolve(__dirname, "dist"),
      port: 3000,
      hot: true,
      open: true,
      historyApiFallback: { index: "/login.html" },

      proxy: [
        {
          // Redirige /inv/* → InventarioAPI local
          context: ["/inv"],
          target: "http://localhost:8081",
          pathRewrite: { "^/inv": "" },
        },
        {
          // Redirige /users/* → PracticaAPI local
          context: ["/users"],
          target: "http://localhost:8080",
          pathRewrite: { "^/users": "" },
        },
      ],
    },

    // Source maps solo en desarrollo
    devtool: isDev ? "eval-source-map" : false,

    resolve: {
      // Permite imports sin extensión: import x from './utils/auth'
      extensions: [".js"],
      alias: {
        // Alias útiles para imports más limpios
        "@api": path.resolve(__dirname, "src/js/api"),
        "@components": path.resolve(__dirname, "src/js/components"),
        "@utils": path.resolve(__dirname, "src/js/utils"),
        "@pages": path.resolve(__dirname, "src/js/pages"),
      },
    },
  };
};
