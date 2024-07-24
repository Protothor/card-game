const ghpages = require("gh-pages")

ghpages.clean()
ghpages.publish("build", {nojekyll: true})