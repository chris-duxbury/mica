# webui - Web server interface for camera control

This project includes client-side javascript code implemented using
[AngularJS](http://angularjs.org/), and HTML+CSS.

## Dependencies

Building this project requires that you have node, grunt, bower, and gulp installed. 

### Node:
This can be a PITA.

#### THIS WORKED FOR ME (2021-06-07):
Download `node-v0.10.48.tar.gz` from [https://nodejs.org/download/release/v0.10.48/]
Extract the folder somewhere (e.g. ~/tmp/node-v0.10.48)
Navigate a terminal to the folder
```
./configure
make
sudo make install
```

#### THIS DID NOT WORK FOR ME (2021-06-07):
I couldn't get v12 to work. I could install.
Strangly, running the `setup_6.x` will make `nodejs --version` return v8.10.0.
v8.10.0 appeared to work somewhat, but after this sequence, I'd deventually get
stuck with the minify script crashing during parsing something, so while
I could do the `webui/app/$ gulp build` command, I could not get the real build
`webui/app/$ gulp build --production` to work.
```
curl -fsSL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt install libssl1.0-dev
sudo apt install nodejs-dev
sudo apt install node-gyp
sudo apt install npm
```

### After node is installed
grunt: `sudo npm install -g grunt-cli@0.1.13`
bower: `sudo npm install -g bower@1.8.12`
gulp: `sudo npm install -g gulp@3.9.1`

## Applications

There are actually two Angular applications in this project. The main application
is stored in `app/` and provides the user interface. The second application is 
stored in `factoryapp/` and provides a second interface intended for use by 
micasense for camera setup and calibration.

## Building

There are a few typical make commands that you'll want to use:

`make` or `make tarball` will automatically build production versions of app
and factoryapp, and bundle them into `webui_local.tar.gz`

`make INSTALL_PREFIX=/your/install/path/here install` will automatically
build production versions of app and factoryapp, and copy the outputs to
`[path you gave]/web/*`

`make scp` will automatically build *debug* versions of app and and copy
the outputs to `root@zed:/web/*`. If you only wish to build and copy one
of the apps, use `make scp_app` or `make scp_factoryapp`
