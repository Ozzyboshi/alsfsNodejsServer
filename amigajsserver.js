var express = require('express');
var SerialPort = require('serialport');
var bodyParser = require('body-parser')
var fs = require('fs');
var Queue = require('better-queue');
const uuidv4 = require('uuid/v4');
var execSync = require('child_process').execSync;
var expressValidator = require('express-validator');

var app = express();
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: false });
app.use(expressValidator());

// Enable long json http messages for adf transfers
app.use(bodyParser.json({limit: '5mb'}));

var recvFunctions=require('./recvFunct.js');

exports.TERMINAL_READY = true;
exports.STATCACHE = [];

// Initialize the task queuer manager with retry each second
var taskQueueManager = new Queue(function (task, cb) 
{
	task.next();
	cb();
},
{
	precondition: function (cb) 
	{
		//console.log("Terminale "+exports.TERMINAL_READY);
		cb(null,exports.TERMINAL_READY);
	},
	preconditionRetryTimeout: 500
});


if (process.argv.length<4) 
{
	console.log("Usage: amigajsserver serialfile ip_to_bind (ex. amigajsserver /dev/ttyUSB0 192.168.137.3)");
	process.exit(1);
}

// Set serial porto to 19200
var command="stty 19200 -parenb cs8 crtscts -ixon -ixoff raw iutf8 -F "+process.argv[2];
console.log("Send "+command);
execSync(command);

// Start of bootstrap mode

if (process.argv.length==5 && process.argv[4]=="-bootstrap")
{
	var stage=0;
	console.log("Type 'type ser: to ram: setup on your amiga' and press a");
	
	var exec = require('child_process').exec;
	var command="cat receive.rexx > "+process.argv[2];
  	var keypress = require('keypress');
	keypress(process.stdin);
	process.stdin.on('keypress', function (ch, key) 
	{
		//console.log('got "keypress"', key);
		if (key && key.ctrl && key.name == 'c') 
		{
			process.stdin.pause();
		}
		if (key.name == 'a') 
		{
			if (stage==0)
			{
				console.log("Send "+command);
				execSync(command);
				console.log("Press ctrl+c on your amiga and then press a in this terminal");
				stage=1;
			}
			else if (stage==1)
			{
				for (var i=0;i<16;i++)
				{
					command="echo '1234567890' > "+process.argv[2];
					//console.log("Send "+command);
					execSync(command);
				}
				console.log("Type rx ram:setup on your amiga and then press a in this terminal");
				stage=2;
			}
			else if (stage==2)
			{
				command="cat alsfssrv > "+process.argv[2];
				console.log("type ram:alsfssrv on your amiga and then press a in this terminal to exit");
				execSync(command);
				stage=3;
			}
			else if (stage==3)
			{
				console.log("Setup completed, rerun without --bootstrap");
				process.exit(0);
			}
		}
	});
	process.stdin.setRawMode(true);
	process.stdin.resume();
	// End of bootstrap mode
}
else
{
	console.log("Opening "+process.argv[2]);
	var port = new SerialPort(process.argv[2],{baudRate:19200,dataBits:8,stopBits:1,parity:"none",rtscts:true,xon:true,xoff:true,bufferSize:4096,autoOpen: true,parser: SerialPort.parsers.byteDelimiter([3])});
	var amigaCmd="";
	var Volumes="";
	var RECVFUNCT=undefined;
	var CUSTOMDATA=0;

	port.on('data', function (data) {
		RECVFUNCT(data,CUSTOMDATA);
	});

	var taskQueuer = function (req, res, next) {
	  console.log('Putting into queue task');
	  taskQueueManager.push({ id:uuidv4() ,next:next });
	}

	// Middleware used to queue tasks
	app.use(taskQueuer);

	// Web routing starts here
	

	/**
	* @apiGroup List volumes
	* @apiName listVolumes
 	* @apiExample {curl} Example usage:
 	* curl -i http://localhost:8081/listVolumes
 	* HTTP/1.1 200 OK
	* X-Powered-By: Express
	* Date: Sat, 14 Oct 2017 06:23:17 GMT
	* Connection: keep-alive
	* Content-Length: 27
	*
	* ["Ram Disk","Workbench2.1"]
 	* @api {get} /listVolumes
 	* @apiName listVolumes
 	* @apiSuccess {Object[]} volumes Volumes mounted on the Amiga.
 	* @apiVersion 1.0.0
 	* @apiDescription 
 	* listVolums reads all the volumes currently mounted on the amiga and returns them in an array.
 	* 
 	* Non-Dos volumes are not part of the resulting array.
 	*/
	app.get('/listVolumes', function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.listVolumesRecv;
		CUSTOMDATA=res;
		var cmd = String.fromCharCode(118)+String.fromCharCode(111)+String.fromCharCode(108)+String.fromCharCode(115)+String.fromCharCode(4);
		console.log("Sending "+cmd);	
		port.write(cmd,function () {
			console.log("List volumes sent");
		});
	});

	/**
	* @apiGroup List devices
	* @apiName listDevices
 	* @apiExample {curl} Example usage:
 	*	curl -i http://localhost:8081/listDevices
 	*	HTTP/1.1 200 OK
	*	X-Powered-By: Express
	*	Date: Sat, 14 Oct 2017 06:26:39 GMT
	*	Connection: keep-alive
	*	Content-Length: 56
	*
	*	["PIPE","RAM","CON","RAW","SER","PAR","PRT","DF0","CC0"]
 	* @api {get} /listDevices
 	* @apiName listDevices
 	* @apiSuccess {Object[]} devices  Devices recognized from AmigaDos.
 	* @apiVersion 1.0.0
 	* @apiDescription 
 	* listDevices lists all the devices currently available on the Amiga and returns them in an array.
 	* 
 	* Usually they are (on a Amiga 600 unexpanded):
 	* 
 	* PIPE - transfers data from one program to another using temporary storage in RAM
 	*
 	* RAM - Ram disk
 	*
 	* CON - Console device
 	*
 	* RAW - Raw device
 	*
 	* SER - Serial device
 	*
 	* PAR - Parallel device
 	*
 	* PRT - Printer device
 	*
 	* DF0 - Floppy drive 0
 	*
 	* CC0 - PCMCIA Card drive device ?
 	*/
	app.get('/listDevices', function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.listDevicesRecv;
		CUSTOMDATA=res;
		var cmd = String.fromCharCode(100)+String.fromCharCode(101)+String.fromCharCode(118)+String.fromCharCode(105)+String.fromCharCode(99)+String.fromCharCode(101)+String.fromCharCode(4);
		console.log("Sending "+cmd);	
		port.write(cmd,function () {
			console.log("List device sent");
		});
	});

	/**
	* @apiGroup List floppies
	* @apiName listFloppies
 	* @apiExample {curl} Example usage:
 	* 	curl -i http://localhost:8081/listFloppies
 	*	HTTP/1.1 200 OK
	*	X-Powered-By: Express
	*	Date: Sat, 14 Oct 2017 06:19:29 GMT
	*	Connection: keep-alive
	*	Content-Length: 7
	*
	*	["DF0"]
 	* @api {get} /listFloppies
 	* @apiName listFloppies
 	* @apiSuccess {Object[]} floppies  Floppies units recognized from AmigaDos.
 	* @apiVersion 1.0.0
 	* @apiDescription 
 	* listFloppies lists all the floppy disk drives currently available on the Amiga and returns them in an array (ex DF0:DF1..).
 	*/
	app.get('/listFloppies', function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.listFloppiesRecv;
		CUSTOMDATA=res;
		var cmd = String.fromCharCode(100)+String.fromCharCode(101)+String.fromCharCode(118)+String.fromCharCode(105)+String.fromCharCode(99)+String.fromCharCode(101)+String.fromCharCode(4);
		console.log("Sending "+cmd);	
		port.write(cmd,function () {
			console.log("List floppies sent");
		});
	});

	/**
	* @apiGroup List content
	* @apiName listContent
	* @apiParam {path} Full amiga path where the data must be retrieved.
 	* @apiExample {curl} Example usage:
 	*	curl -i  -H "Content-Type: application/json" -X GET -d '{"path":"Ram Disk:"}' http://localhost:8081/listContent
	*	HTTP/1.1 200 OK
	*	X-Powered-By: Express
	*	Date: Sat, 14 Oct 2017 07:30:39 GMT
	*	Connection: keep-alive
	*	Content-Length: 43
	*
	*	["alsfssrv","setup","ENV","Clipboards","T"]
	* @apiParamExample {json} Request-Example:
                 { "path": "Ram Disk:" }
 	* @api {get} /listContent
 	* @apiName listContent
 	* @apiSuccess {Object[]} content  Files and drawers found under the given path.
 	* @apiVersion 1.0.0
 	* @apiDescription 
 	* listContent returns the names of all files and drawers found under a certain path.
 	* The path must be absolute and it must start with a valid mounted volume name like "Ram Disk:"
 	* Examine and ExNext amigados functions are used on the Amiga side to retrieve the data.
 	*/
	app.get('/listContent', jsonParser, function (req, res) {
		req.check('path','Invalid path').isLength({min:1});
		if (ApiValidate(req,res)==false) return ;
		exports.TERMINAL_READY=false;
		console.log("avvio listcontent");
		RECVFUNCT=recvFunctions.listContentRecv;
		CUSTOMDATA={"res":res,"path":req.body.path,port:port};
		var cmd = String.fromCharCode(108)+String.fromCharCode(105)+String.fromCharCode(115)+String.fromCharCode(116)+String.fromCharCode(4);
		console.log("Sending "+cmd);	
		console.log("Path "+req.body.path);
		port.write(cmd,function () {
			console.log("List content sent");
		});
	});

	/**
	* @apiGroup Stat
	* @apiName stat
	* @apiParam {path} String Full amiga path (drawer of file) to stat.
 	* @apiExample {curl} Example usage
 	*	curl -i  -H "Content-Type: application/json" -X GET -d '{"path":"Ram Disk:"}' http://localhost:8081/stat
	*	HTTP/1.1 200 OK
	*	X-Powered-By: Express
	*	Date: Sun, 15 Oct 2017 16:10:38 GMT
	*	Connection: keep-alive
	*	Content-Length: 92
	*
	*	{"st_size":"0","blk_size":"1","directory":"1","days":"7252","minutes":"925","seconds":"189"}
	* @apiExample {curl} Example usage 2
	*	curl -i  -H "Content-Type: application/json" -X GET -d '{"path":"Workbench2.1:System.info"}' http://localhost:8081/stat
	*	HTTP/1.1 200 OK
	*	X-Powered-By: Express
	*	Date: Sun, 15 Oct 2017 16:14:55 GMT
	*	Connection: keep-alive
	*	Content-Length: 95
	*
	*	{"st_size":"632","blk_size":"2","directory":"0","days":"5386","minutes":"992","seconds":"1200"}
	* @apiExample {curl} Example usage 3
	* 	curl -i  -H "Content-Type: application/json" -X GET -d '{"path":"Workbench2.1:System"}' http://localhost:8081/stat
	* 	HTTP/1.1 200 OK
	* 	X-Powered-By: Express
	* 	Date: Sun, 15 Oct 2017 16:25:34 GMT
	* 	Connection: keep-alive
	*	Content-Length: 93
	*
	*	{"st_size":"0","blk_size":"0","directory":"1","days":"5586","minutes":"188","seconds":"2450"}
	* @apiParamExample {json} Request-Example:
	*   { "path": "Ram Disk:" }
 	* @api {get} /stat
 	* @apiName stat
 	* @apiSuccess {Object} stat  Stat informations about the requested file or drawer.
 	* @apiSuccess {Number}  profile.st_size Size of the file in bytes (0 for drawers).
 	* @apiSuccess {Number}  profile.blk_size Block size of the file.
 	* @apiSuccess {Boolean}  profile.directory Flag indicating if thr requeste resource is a drawer (1) or not (0).
 	* @apiSuccess {Number}  profile.days Days of the creation date since 1 Jan 1970.
 	* @apiSuccess {Number}  profile.minutes Minutes of the creation date since 1 Jan 1970.
 	* @apiSuccess {Number}  profile.ticks Ticks of the creation date since 1 Jan 1970.
 	* @apiVersion 1.0.0
 	* @apiDescription 
 	* Stat returns informations about a file or directory inside the Amiga.
 	*/
	app.get('/stat', jsonParser, function (req, res) {
		req.check('path','Invalid path').isLength({min:1});
		if (ApiValidate(req,res)==false) return ;
		exports.TERMINAL_READY=false;
		if (exports.STATCACHE && exports.STATCACHE[req.body.path])
		{
			var convertedObj={
				"st_size":exports.STATCACHE[req.body.path][0],
				"blk_size":exports.STATCACHE[req.body.path][1],
				"directory":exports.STATCACHE[req.body.path][2],
				"days":exports.STATCACHE[req.body.path][3],
				"minutes":exports.STATCACHE[req.body.path][4],
				"seconds":exports.STATCACHE[req.body.path][5],
				"cached":"true"
			};
			res.end( JSON.stringify(convertedObj) );
			exports.STATCACHE[req.body.path]=0;
			exports.TERMINAL_READY=true;
			return ;
		}
		RECVFUNCT=recvFunctions.statRecv;
		CUSTOMDATA={"res":res,"path":req.body.path,"port":port};
		var cmd = String.fromCharCode(115)+String.fromCharCode(116)+String.fromCharCode(97)+String.fromCharCode(116)+String.fromCharCode(4);
		console.log("Sending "+cmd);	
		port.write(cmd,function () {
			console.log("stat request sent");
		});
	});

	/**
	* @apiGroup StoreBinary
	* @apiName storeBinary
	* @apiParam {String} amigafilename Full path where the file must be stored.
	* @apiParam {Number} size Size of the raw data to be stored.
	* @apiParam {Number} offset Offset where to start writing at.
	* @apiParam {Boolean} [dryRun=0] Pass 1 if you want just to test without writing any data.
 	* @apiExample {curl} Example usage:
 	*	curl -i  -H "Content-Type: application/json" -X GET -d '{"path":"Ram Disk:"}' http://localhost:8081/storeBinary
	*	HTTP/1.1 200 OK
	*	X-Powered-By: Express
	*	Date: Sat, 14 Oct 2017 07:30:39 GMT
	*	Connection: keep-alive
	*	Content-Length: 43
	*
	*	["alsfssrv","setup","ENV","Clipboards","T"]
	* @apiParamExample {json} Request-Example:
	*	{ "amigafilename": "Ram Disk:test.txt" }
	*	{ "data": "1234567890" }
	*	{ "size": 10 }
	*	{ "offset": 0 }
	*	{ "dryRun": 0 }
 	* @api {post} /storeBinary
 	* @apiName storeBinary
 	* @apiSuccess {Object[]} content  Store.
 	* @apiVersion 1.0.0
 	* @apiDescription 
 	* store saved a file stored in the node js server to the amiga.
 	*/
	app.post('/storeBinary', jsonParser , function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.storeBinaryRecv;
		CUSTOMDATA={"res":res,"amigaFilename":req.body.amigafilename,"data":req.body.data,"size":req.body.size,"offset":req.body.offset,"dryRun":req.body.dryrun,"port":port};

		var cmdWrite = String.fromCharCode(115)+String.fromCharCode(116)+String.fromCharCode(111)+String.fromCharCode(114)+String.fromCharCode(101)+String.fromCharCode(114)+String.fromCharCode(97)+String.fromCharCode(119)+String.fromCharCode(4);
		port.write(cmdWrite,function () {
			console.log("Store binary data request sent");
			return ;
		});
	});

	/********** Start create empty file **********/
	app.post('/createEmptyFile', jsonParser , function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.createEmptyFileRecv;
		CUSTOMDATA={"res":res,"amigaFilename":req.body.amigafilename,"port":port};

		var cmdWrite = String.fromCharCode(99)+String.fromCharCode(114)+String.fromCharCode(101)+String.fromCharCode(97)+String.fromCharCode(116)+String.fromCharCode(101)+String.fromCharCode(102)+String.fromCharCode(105)+String.fromCharCode(108)+String.fromCharCode(101)+String.fromCharCode(4);
		port.write(cmdWrite,function () {
			console.log("Create File name request sent");
			return ;
		});
	});

	/********** Start delete drawer or file **********/
	app.delete('/deleteFile', jsonParser , function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.deleteFileRecv;
		CUSTOMDATA={"res":res,"amigaFilename":req.body.amigafilename,"port":port};

		var cmdWrite = String.fromCharCode(100)+String.fromCharCode(101)+String.fromCharCode(108)+String.fromCharCode(101)+String.fromCharCode(116)+String.fromCharCode(101)+String.fromCharCode(4);
		port.write(cmdWrite,function () {
			console.log("Delete File request sent");
			return ;
		});
	});

	/********** Start create empty drawer **********/
	app.post('/createEmptyDrawer', jsonParser , function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.createEmptyDrawerRecv;
		CUSTOMDATA={"res":res,"amigaDrawername":req.body.amigadrawername,"port":port};

		var cmdWrite = String.fromCharCode(109)+String.fromCharCode(107)+String.fromCharCode(100)+String.fromCharCode(114)+String.fromCharCode(97)+String.fromCharCode(119)+String.fromCharCode(101)+String.fromCharCode(114)+String.fromCharCode(4);
		port.write(cmdWrite,function () {
			console.log("Create Drawer request sent");
			return ;
		});
	});

	/********** Start rename file or drawer **********/
	app.put('/renameFileOrDrawer', jsonParser , function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.renameFileOrDrawerRecv;
		CUSTOMDATA={"res":res,"amigaNewFilename":req.body.amiganewfilename,"amigaOldFilename":req.body.amigaoldfilename,"port":port};

		var cmdWrite = String.fromCharCode(114)+String.fromCharCode(101)+String.fromCharCode(110)+String.fromCharCode(97)+String.fromCharCode(109)+String.fromCharCode(101)+String.fromCharCode(4);
		port.write(cmdWrite,function () {
			console.log("Rename File or Drawer request sent");
			return ;
		});
	});

	/********** Start read amiga file **********/
	app.get('/readFile', jsonParser , function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.readFileRecv;
		CUSTOMDATA={"res":res,"amigaFilename":req.body.amigafilename,"size":req.body.size,"offset":req.body.offset,"port":port};

		var cmdWrite = String.fromCharCode(114)+String.fromCharCode(101)+String.fromCharCode(97)+String.fromCharCode(100)+String.fromCharCode(102)+String.fromCharCode(105)+String.fromCharCode(108)+String.fromCharCode(101)+String.fromCharCode(4);
		port.write(cmdWrite,function () {
			console.log("Read File request sent");
			return ;
		});
	});

	/********** Start write amiga adf file **********/
	app.post('/writeAdf', jsonParser , function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.writeAdfRecv;
		CUSTOMDATA={"res":res,"trackDevice":req.body.trackDevice,"adfFilename":req.body.adfFilename,"start":req.body.start,"end":req.body.end,"port":port};

		var cmdWrite = String.fromCharCode(119)+String.fromCharCode(114)+String.fromCharCode(105)+String.fromCharCode(116)+String.fromCharCode(101)+String.fromCharCode(97)+String.fromCharCode(100)+String.fromCharCode(102)+String.fromCharCode(4);
		port.write(cmdWrite,function () {
			console.log("Write adf File request sent");
			return ;
		});
	});

	/**
	* @apiGroup WriteAdfB64
	* @apiName writeAdfB64
	* @apiParam {Number} trackDevice Trackdevice where to write data (for example 0 for DF0, 1 for DF1 and so on up to DF3).
	* @apiParam {String} adfData Base64 encoded data to write representing a regular adf image (or part of it).
	* @apiParam {Number} start Sector where to start writing at (for a full adf file put 0).
	* @apiParam {Number} end Sector where to end writing at (for a full adf file put 79).
 	* @apiExample {curl} Example usage:
 	*	curl -i  -H "Content-Type: application/json" -X POST -d '{"trackDevice":0,"adfData":"place your adf base64 encode message here","start":0,"end":79}' http://localhost:8081/writeAdfB64
	*	HTTP/1.1 200 OK
	*	X-Powered-By: Express
	*	Date: Sat, 14 Oct 2017 07:30:39 GMT
	*	Connection: keep-alive
	*	Content-Length: 43
	*
	* @apiParamExample {json} Request-Example:
	*	{ "trackDevice": 0 }
	*	{ "adfData": "AAAA..." }
	*	{ "start": 0 }
	*	{ "end": 79 }
 	* @api {post} /writeAdfB64
 	* @apiName writeAdfB64
 	* @apiSuccess {String} content  Store.
 	* @apiVersion 1.0.0
 	* @apiDescription 
 	* Write a b64 encode adf file to a floppy drive.
 	*/
	app.post('/writeAdfB64', jsonParser , function (req, res) {
		req.check('adfData','Base64 encoded Adf data is required').not().isBase64();
		req.check('trackdevice','Invalid trackdevice (digit values are allowed: 0 1 2 and 3)').isLength({min:0,max:3});
		req.check('start','Invalid start (values allowed: 0-79)').isLength({min:0,max:79});
		req.check('end','Invalid end (values allowed: 0-79)').isLength({min:0,max:79});
		if (ApiValidate(req,res)==false) return ;
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.writeAdfB64Recv;
		CUSTOMDATA={"res":res,"trackDevice":req.body.trackDevice,"adfData":new Buffer(req.body.adfB64Data,'base64'),"start":req.body.start,"end":req.body.end,"port":port};

		var cmdWrite = String.fromCharCode(119)+String.fromCharCode(114)+String.fromCharCode(105)+String.fromCharCode(116)+String.fromCharCode(101)+String.fromCharCode(97)+String.fromCharCode(100)+String.fromCharCode(102)+String.fromCharCode(4);
		port.write(cmdWrite,function () {
			console.log("Write adf File request sent");
			return ;
		});
	});

	/********** Start floppy disk test **********/
	app.get('/readAdf', jsonParser , function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.readAdfRecv;
		CUSTOMDATA={"res":res,"trackDevice":req.body.trackDevice,"size":req.body.size,"offset":req.body.offset,"port":port};

		var cmdRead = String.fromCharCode(114)+String.fromCharCode(101)+String.fromCharCode(97)+String.fromCharCode(100)+String.fromCharCode(97)+String.fromCharCode(100)+String.fromCharCode(102)+String.fromCharCode(4);
		port.write(cmdRead,function () {
			console.log("Read disk in drive request sent");
			return ;
		});
	});

	/********** Start floppy disk test **********/
	app.get('/testFloppyDisk', jsonParser , function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.testFloppyDiskRecv;
		CUSTOMDATA={"res":res,"trackDevice":req.body.trackDevice,"port":port};

		var cmdWrite = String.fromCharCode(99)+String.fromCharCode(104)+String.fromCharCode(107)+String.fromCharCode(102)+String.fromCharCode(108)+String.fromCharCode(111)+String.fromCharCode(112)+String.fromCharCode(112)+String.fromCharCode(121)+String.fromCharCode(4);
		port.write(cmdWrite,function () {
			console.log("Test floppy disk in drive request sent");
			return ;
		});
	});

	/********** Start volume relabel **********/
	app.put('/relabel', jsonParser , function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.relabelRecv;
		CUSTOMDATA={"res":res,"oldVolumeName":req.body.oldVolumeName,"newVolumeName":req.body.newVolumeName,"port":port};

		var cmdWrite = String.fromCharCode(114)+String.fromCharCode(101)+String.fromCharCode(108)+String.fromCharCode(97)+String.fromCharCode(98)+String.fromCharCode(101)+String.fromCharCode(108)+String.fromCharCode(4);
		port.write(cmdWrite,function () {
			console.log("Relabel volume request sent");
			return ;
		});
	});

	/********** Start delay **********/
	app.get('/delay', jsonParser , function (req, res) {
		exports.TERMINAL_READY=false;
		RECVFUNCT=recvFunctions.delayRecv;
		CUSTOMDATA={"res":res,"delay":req.body.delay,"port":port};

		var cmdWrite = String.fromCharCode(100)+String.fromCharCode(101)+String.fromCharCode(108)+String.fromCharCode(97)+String.fromCharCode(121)+String.fromCharCode(4);
		port.write(cmdWrite,function () {
			console.log("Delay request sent");
			return ;
		});
	});

	app.get('/exit', function (req, res) {
		var cmd = String.fromCharCode(101)+String.fromCharCode(120)+String.fromCharCode(105)+String.fromCharCode(116)+String.fromCharCode(4);
		port.write(cmd,function () {
			console.log("Exit sent");
		});
		res.end( "data" );
	});

	var webserverIp=process.argv[3];
	var webserverPort=8081;
	if (process.argv[3].indexOf(':') > -1)
	{
		webserverIp=process.argv[3].substr(0, process.argv[3].indexOf(':'));
		webserverPort=process.argv[3].split(':').pop();
	}
	console.log("Trying to listen on ip "+webserverIp+" and port "+webserverPort);
	var server = app.listen(webserverPort,webserverIp, function () {
	  var host = server.address().address
	  var port = server.address().port
	  console.log("Amiga alsfs server webApi listening at http://%s:%s", host, port)
	});
	server.timeout = 0;
}

function ApiValidate(req,res)
{
	var errors = req.validationErrors();
	if (errors)
	{
		res.status(400);
		res.end( 'Input error'+JSON.stringify(errors, null, 2));
		return false;
	}
	return true;
}
