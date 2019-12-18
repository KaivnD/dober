import prependify from "prependify";
import browserify from "browserify";
import UglifyJS from "uglify-js"
import rds from 'randomstring'
import path from 'path'
import fs from 'fs'
import os from 'os'

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
  public Parse(fileIn: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(fileIn)) {
        reject(new Error('Input file is not found'))
        return
      }
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

      const tmpfile = path.join(os.tmpdir(), rds.generate({
        length: 12,
        charset: 'alphanumeric'
      }) + '.jsx')

      const fws = fs.createWriteStream(tmpfile)

      fws.on('close', () => {
        const res = UglifyJS.minify(fs.readFileSync(tmpfile, {encoding: 'utf-8'}), {
          mangle: {
            eval: true
          }
        })
        if (res.error) reject(res.error)
        else {
          fs.unlinkSync(tmpfile)
          fs.writeFileSync(tmpfile, res.code, {encoding: 'utf-8'})
          resolve(tmpfile)
        }
      })

      b.bundle().pipe(fws);
    })
  }
}
