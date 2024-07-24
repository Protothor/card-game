const fs = require('fs')

const x = fs.readdirSync("./src/Card/Art")

const rep = (a) => a.replaceAll(/(\.png| )/g, "")
const out = x.reduce((agg, next) => agg += `import ${rep(next)} from "./Art/${next}"\n`, "") + "\nexport default " + JSON.stringify(x.map(z => rep(z))).replaceAll('"', "").replace("[","{").replace("]","}")
fs.writeFileSync("./src/Card/Art.js", out)