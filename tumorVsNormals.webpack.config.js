var MiniCssExtractPlugin = require('mini-css-extract-plugin');
var WebpackFailPlugin = require('webpack-fail-plugin');
var ProgressBarPlugin = require('progress-bar-webpack-plugin');
var TerserPlugin = require('terser-webpack-plugin');

const webpack = require('webpack');
const path = require('path');

const join = path.join;
const resolve = path.resolve;

const root = resolve(__dirname);
const src = join(root, 'src');
const modules = join(root, 'node_modules');
const common = join(src, "common");
const tvnLib = join(root, 'tvn');

const fontPath = 'reactapp/[hash].[ext]';
const imgPath = 'reactapp/images/[hash].[ext]';

var sassResourcesLoader = {
    loader: 'sass-resources-loader',
    options: {
        resources: [
            path.resolve(__dirname, 'node_modules/bootstrap-sass/assets/stylesheets/bootstrap/_variables.scss'),
            path.resolve(__dirname, 'node_modules/bootstrap-sass/assets/stylesheets/bootstrap/_mixins'),
            './src/globalStyles/variables.scss'
        ]
    }
};

var config = {
    //target: 'web',
    stats: {
        colors: true
    },
    entry: {
        tvn: [
            `${path.join(src, 'tvn', 'tvn.jsx')}`
        ],
    },
    output: {
        path: path.resolve(__dirname, 'tvn-dist'),
        libraryTarget: 'global'
    },

    optimization: {
        minimizer: [
            new TerserPlugin({
                parallel: !process.env.NO_PARALLEL,
            }),
        ],
    },

    externals: {
       mobx:'mobx'
    },

    resolve: {
        'extensions': [
            '.js',
            '.jsx',
            '.json',
            '.ts',
            '.tsx',
        ],

        alias: {
            pages: join(src, 'pages'),
            shared: join(src, 'shared'),
            'public-lib': join(src, 'public-lib'),
            appConfig: path.join(__dirname + '/src', 'config', ((process.env.NODE_ENV === 'test')? 'test.' : '') + 'config'),
        }
    },

    resolveLoader: {
        modules: [
            path.resolve(__dirname, 'loaders'),
            path.join(process.cwd(), 'node_modules')
        ]
    },

    plugins: [
        WebpackFailPlugin,
        new ProgressBarPlugin()
    ],

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            "presets": ["@babel/preset-env", "@babel/preset-react"],
                            //"cacheDirectory": babelCacheFolder
                        }
                    },
                    {
                        loader: "ts-loader",
                        options: {
                            configFile: 'tvn-commons.json'
                        }
                    }
                ],
                exclude: /node_modules/
            },
            {
                test: /\.(js|jsx|babel)$/,
                use: [{
                    loader: "babel-loader",
                    options: {
                        "presets": ["@babel/preset-env", "@babel/preset-react"]
                    }
                }],
                exclude: function(modulePath) {
                    return /node_modules/.test(modulePath) &&
                        !/igv\.min/.test(modulePath);
                }
            },
            {
                test: /\.otf(\?\S*)?$/,
                use: [{
                    loader: `url-loader`,
                    options: {
                        name: fontPath,
                        limit: 10000
                    }
                }]
            },
            {
                test: /\.eot(\?\S*)?$/,
                use: [{
                    loader: `url-loader`,
                    options: {
                        name: fontPath,
                        limit: 10000
                    }
                }],
            },
            {
                test: /\.svg(\?\S*)?$/,
                use: [
                    {
                        loader: `url-loader`,
                        options: {
                            name: fontPath,
                            mimetype: 'image/svg+xml',
                            limit: 10000
                        }
                    }
                ],
            },
            {
                test: /\.ttf(\?\S*)?$/,
                use: [{
                    loader: `url-loader`,
                    options: {
                        name: fontPath,
                        mimetype: 'application/octet-stream',
                        limit: 10000
                    }
                }],
            },
            {
                test: /\.woff2?(\?\S*)?$/,
                use: [{
                    loader: `url-loader`,
                    options: {
                        name: fontPath,
                        mimetype: 'application/font-woff',
                        limit: 10000
                    }
                }],
            },
            {
                test: /\.(jpe?g|png|gif)$/,
                use: [{
                    loader: `url-loader`,
                    options: {
                        name: imgPath,
                        limit: 10000
                    }
                }],
            },
            {
                test: /\.swf$/,
                use: [
                    {
                        loader: `file-loader`,
                        options: {
                            name: imgPath
                        }
                    }
                ],
            },
            {
                test: /\.pdf$/,
                use: [
                    {
                        loader: `url-loader`,
                        options: {
                            name: imgPath,
                            limit: 1
                        }
                    }
                ],
            },
            {
                test: /\.js$/,
                enforce: "pre",
                use: [{
                    loader: "source-map-loader",
                }]
            },
            {
                test: require.resolve("3dmol"),
                // 3Dmol expects "this" to be the global context
                use: "imports-loader?this=>window"
            }
        ],

        noParse: [/3Dmol-nojquery.js/, /jspdf/],

    },


};

// ENV variables
// const dotEnvVars = dotenv.config();
// const environmentEnv = dotenv.config({
//     path: join(root, 'config', `${NODE_ENV}.config.js`),
//     silent: true
// });
// const envVariables =
//     Object.assign({}, dotEnvVars, environmentEnv);

// const defines =
//     Object.keys(envVariables)
//         .reduce((memo, key) => {
//             const val = JSON.stringify(envVariables[key]);
//             memo[`__${key.toUpperCase()}__`] = val;
//             return memo;
//         }, {
//             __NODE_ENV__: JSON.stringify(NODE_ENV),
//             __DEBUG__: isDev
//         });

config.plugins = [
    //new webpack.DefinePlugin(defines),
    new MiniCssExtractPlugin({
        filename: 'styles.css',
        allChunks: true
    }),
    new webpack.ProvidePlugin({
        $: "jquery",
        jQuery: "jquery"
    })
].concat(config.plugins);
// END ENV variables

// include jquery when we load boostrap-sass
config.module.rules.push(
    {
        test: /bootstrap-sass[\/\\]assets[\/\\]javascripts[\/\\]/,
        use: [{
            loader: 'imports-loader',
            options: {
                'jQuery': 'jquery'
            }
        }]
    }
);

config.devtool = "source-map",
    config.output.publicPath = '/';
config.node = { fs: 'empty' }

// css modules for any scss matching test
config.module.rules.push(
    {
        test: /\.module\.scss$/,
        use: [
            {
                loader: MiniCssExtractPlugin.loader,
                options: {
                    fallback: 'style-loader'
                },
            },
            {
                loader: 'css-loader',
                options: {
                    modules: true,
                    localIdentName: '[name]__[local]__[hash:base64:5]'
                }
            },
            'sass-loader',
            sassResourcesLoader
        ]
    }
);

config.module.rules.push(
    {
        test: /\.scss$/,
        exclude: /\.module\.scss/,
        use: [
            {
                loader: MiniCssExtractPlugin.loader,
                options: {
                    fallback: 'style-loader'
                },
            },
            'css-loader',
            'sass-loader',
            sassResourcesLoader
        ]
    }
);

config.module.rules.push(
    {
        test: /\.css/,
        use: [
            {
                loader: MiniCssExtractPlugin.loader,
                options: {
                    fallback: 'style-loader'
                },
            },
            'css-loader'
        ]
    }
);

// Roots
config.resolve.modules = [
    tvnLib,
    common,
    modules
];

// end Roots

module.exports = config;
