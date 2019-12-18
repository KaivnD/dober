import prependify from "prependify";
import browserify from "browserify";
import fs from 'fs'

export class Extendscript {
  public plugins: any[];

  public constructor() {
    const prototypePolyfills = fs.readFileSync(
      require.resolve("extendscript.prototypes"),
      "utf8"
    );
    this.plugins = [[prependify, prototypePolyfills]];
  }

  /**
   * Prepend
   */
  public Prepend(content: string) {
    this.plugins.push([
      prependify, content
    ])
  }

  /**
   * Parser
   */
  public Parser(fileIn: string, fileOut: string) {
    const b = browserify({
      entries: [fileIn],
      transform: [
        [
          require.resolve("babelify"),
          {
            presets: ["@babel/preset-env"],
            plugins: [
              require.resolve(
                "babel-plugin-transform-es3-member-expression-literals"
              ),
              require.resolve("babel-plugin-transform-es3-property-literals"),
              require.resolve("babel-plugin-transform-es5-property-mutators")
            ]
          }
        ]
      ],
      plugin: this.plugins
    });

    b.bundle().pipe(fs.createWriteStream(fileOut));
  }
}
