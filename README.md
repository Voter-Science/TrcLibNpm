# TrcLibNpm
TypeScript (JScript) TRC rest client.  This is a CommonJs module that can be used from either command line tools or from browser front ends via browserify. 

This uses JScript Promises via Bluebird. 


# NPM notes
This is an NPM package. 
The NPM package includes just the .js and declaration (.d.ts) files, not the .ts.   
In contrast, the git repro only includes the .ts files and not the .js files. So we need both a .gitignore and .npmignore

The .ts files are in the /src directory, and compiled to the root directory where npm pack can pick them up.  This keeps the compiler input and output in separate directories. 

# Local testing
You can test building the package via running `npm pack` and `npm intall <file>`
See sample.ts  for an example of running from a command line. 


 

