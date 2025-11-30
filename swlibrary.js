const fs = require("fs");
const https = require("https");
const { spawn } = require("child_process");
const pathModule = require("path");
const chalk = require("chalk").default;

/*
@xvlisrinzEBitchCodeAndroid
Why is there no option to use DX or D8
This Usage Is Optional In The File classes.dex For Kotlin
And classes.jar For Java You Can Remove One Or Both Of Them Better
- Install Depence Before Use
- pkg install openjdk-21
- pkg install d8
- npm -i
*/
var repoLibrary = JSON.parse(fs.readFileSync("reposw.json", "utf8"));
var libraryargs = process.argv[2];
if (!libraryargs) {
  return console.log('Use Args\nExample: node swlibrary.js <library>\n< === ! Confused ! === >\nExample: node swlibrary.js com.google.android.material:material:1.9.0\n< === ! Scope Specifications ! === >\ngroup:artifact:version\n');
}
function buildMavenPath(libraryargs, ext = "jar") {
  var [groupId, artifactId, version] = libraryargs.split(":");
  var LibGroup = groupId.replace(/\./g, "/");
  var fileName = `${artifactId}-${version}.${ext}`;
  return { jarPath: `${LibGroup}/${artifactId}/${version}/${fileName}`, artifactId, version, ext };
}

function LibraryDownloader(url, D8FileSt) {
  return new Promise((resolve, reject) => {
    var file = fs.createWriteStream(D8FileSt);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed: ${res.statusCode} ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve(D8FileSt)));
    }).on("error", reject);
  });
}

function D8weDX(jarPath, outputDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    var dx = spawn("d8", [jarPath, "--output", outputDir]);
    dx.stdout.on("data", d => console.log(d.toString()));
    dx.stderr.on("data", d => console.error(d.toString())); //@Build
    dx.on("close", code => {
      if (code === 0) resolve(pathModule.join(outputDir, "classes.dex"));
      else reject(new Error(`D8 Exited ${code}`));
    });
  });
}

(async () => {
  var libraryBaseDir = "./swlibrary";
  let schdown = false;
  for (var replib of repoLibrary) {
    for (let ext of ["jar", "aar"]) {
      var { jarPath, artifactId, version } = buildMavenPath(libraryargs, ext);
      var libraryDir = pathModule.join(libraryBaseDir, `${artifactId}_V_${version}`);
      if (!fs.existsSync(libraryDir)) fs.mkdirSync(libraryDir, { recursive: true });
      var D8File = pathModule.join(libraryDir, `classes.jar`);
      var url = `${replib.url.replace(/\/$/, "")}/${jarPath}`;
      try {
        console.log(chalk.bgGreen(" LOG ") + ` Download From ${replib.name}: ${url}`);
        await LibraryDownloader(url, D8File);
        console.log(chalk.bgGreen(" LOG ") + ` Saved To ${D8File}`);
        if (ext === "aar") {
          var unzipper = require("unzipper");
          await fs.createReadStream(D8File)
          .pipe(unzipper.Extract({ path: libraryDir }));
          fs.renameSync(
            pathModule.join(libraryDir, "classes.jar"),
          );
        }
        try {
          var dexPath = await D8weDX(D8File, libraryDir);
          console.log(chalk.bgGreen(" LOG ") + ` Created Dex: ${dexPath}`);
        } catch {
        console.log(chalk.bgYellow(" DEBUG ") + ` "Creating Dex" Error: ${err.message}`);
        }
        schdown = true;
        break;
      } catch {
        console.log(chalk.bgRed(" FAILED ") + ` Library ${replib.name} Failed, Try Another`);
      }
    }
    if (schdown) {
      break;
    }
  }
  if (!schdown) {
    console.log(chalk.bgRed(" FAILED ") + " Library Not Found ");
    try {
      fs.rmdirSync("./swlibrary"+'/'+`${artifactId}_V_${version}`, { recursive: true, force: true });
      process.exit(-1);
    } catch {
      process.exit(-1);
    }
  } else if (schdown === true) {
    console.log(chalk.bgGreen(" LOG ") + ` DOWNLOAD COMPLETE `);
    process.exit(-1);
  }
})();