var express = require('express');
var SerialPort = require('serialport');
var bodyParser = require('body-parser')
var fs = require('fs');
var Queue = require('better-queue');
const uuidv4 = require('uuid/v4');

var app = express();
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })

var recvFunctions=require('./recvFunct.js');

var LISTVOLUMESCALLED=0;
var STORECALLED=0;
var LISTCONTENTCALLED=0;
var STATCONTENTCALLED=0;

//var TERMINAL_READY=true;
exports.TERMINAL_READY = true;

// Initialize the task queuer manager with retry each second
var taskQueueManager = new Queue(function (task, cb) 
{
	task.next();
	cb();
},
{
	precondition: function (cb) 
	{
		console.log("Terminale "+exports.TERMINAL_READY);
		cb(null,exports.TERMINAL_READY);
	},
	preconditionRetryTimeout: 5000
});


if (process.argv.length<4) {console.log("Usage: amigajsserver serialfile ip_to_bind (ex. amigajsserver /dev/ttyUSB0 192.168.137.3)");process.exit(1);}



// Start of bootstrap mode

if (process.argv.length==5 && process.argv[4]=="-bootstrap")
{
	var stage=0;
	console.log("Type 'type ser: to ram: setup on your amiga' and press a");
	/*port.write(fs.readFileSync("./volumes6"),function () {
		console.log("Bootstrap complete now type 'ram:setup' in your amiga");
	});*/
		var exec = require('child_process').exec;
		var execSync = require('child_process').execSync;
		var command="stty 9600 -parenb cs8 crtscts -ixon -ixoff raw iutf8  > "+process.argv[2]+" && cat receive.rexx > "+process.argv[2];
		var command="cat receive.rexx > "+process.argv[2];
  		var keypress = require('keypress');
			keypress(process.stdin);
			process.stdin.on('keypress', function (ch, key) 
			{
				//console.log('got "keypress"', key);
				if (key && key.ctrl && key.name == 'c') {
				 	process.stdin.pause();
    				}
				if (key.name == 'a') {
					console.log(stage);
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
						command="cat volumes6 > "+process.argv[2];
						console.log("type ram:volumes6 on your amiga and then press a in this terminal to exit");
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
}
else
{

console.log("Opening "+process.argv[2]);
// versione per amiga reale var port = new SerialPort(process.argv[2],{baudRate:19200,dataBits:8,stopBits:1,parity:"none",rtscts:true,bufferSize:4096,autoOpen: true,parser: SerialPort.parsers.byteDelimiter([3])});
/* versione per amiga vertuale */ var port = new SerialPort(process.argv[2],{baudRate:19200,dataBits:8,stopBits:1,parity:"none",rtscts:true,xon:true,xoff:true,bufferSize:4096,autoOpen: true,parser: SerialPort.parsers.byteDelimiter([3])});
// End of bootstrap mode
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

  //next()
}

// Middleware used to queue tasks
app.use(taskQueuer);

// Web routing starts here
/********** Start list volumes **********/
app.get('/listVolumes', function (req, res) {
	
	RECVFUNCT=recvFunctions.listVolumesRecv;
	//recvFunctions.LISTVOLUMESCALLED=res;
	CUSTOMDATA=res;
	var cmd = String.fromCharCode(118)+String.fromCharCode(111)+String.fromCharCode(108)+String.fromCharCode(115)+String.fromCharCode(4);
	console.log("Sending "+cmd);	
	port.write(cmd,function () {
		console.log("List volumes sent");
	});
});

/********** Start list devices **********/
app.get('/listDevices', function (req, res) {
	
	RECVFUNCT=recvFunctions.listDevicesRecv;
	CUSTOMDATA=res;
	var cmd = String.fromCharCode(100)+String.fromCharCode(101)+String.fromCharCode(118)+String.fromCharCode(105)+String.fromCharCode(99)+String.fromCharCode(101)+String.fromCharCode(4);
	console.log("Sending "+cmd);	
	port.write(cmd,function () {
		console.log("List device sent");
	});
});

/********** Start list devices **********/
app.get('/listFloppies', function (req, res) {
	
	RECVFUNCT=recvFunctions.listFloppiesRecv;
	CUSTOMDATA=res;
	var cmd = String.fromCharCode(100)+String.fromCharCode(101)+String.fromCharCode(118)+String.fromCharCode(105)+String.fromCharCode(99)+String.fromCharCode(101)+String.fromCharCode(4);
	console.log("Sending "+cmd);	
	port.write(cmd,function () {
		console.log("List floppies sent");
	});
});

/********** Start list content of directory **********/
app.get('/listContent', function (req, res) {
	console.log("avvio listcontent");
	RECVFUNCT=recvFunctions.listContentRecv;
	//LISTCONTENTCALLED={"res":res,"path":req.query.path};
	CUSTOMDATA={"res":res,"path":req.query.path,port:port};
	var cmd = String.fromCharCode(108)+String.fromCharCode(105)+String.fromCharCode(115)+String.fromCharCode(116)+String.fromCharCode(4);
	console.log("Sending "+cmd);	
	console.log("Path "+req.query.path);
	port.write(cmd,function () {
		console.log("List content sent");
	});
});

/********** stat file or directory **********/
app.get('/stat', function (req, res) {
	RECVFUNCT=recvFunctions.statRecv;
	CUSTOMDATA={"res":res,"path":req.query.path,"port":port};
	var cmd = String.fromCharCode(115)+String.fromCharCode(116)+String.fromCharCode(97)+String.fromCharCode(116)+String.fromCharCode(4);
	console.log("Sending "+cmd);	
	port.write(cmd,function () {
		console.log("stat request sent");
	});
});

/********** Start store file **********/
app.post('/store', jsonParser , function (req, res) {
	
	RECVFUNCT=recvFunctions.storeRecv;
	CUSTOMDATA={"res":res,"amigaFilename":req.body.amigafilename,"pcFilename":req.body.pcfilename,"dryRun":req.body.dryrun,"port":port};
	/*var amigaFilename = req.body.amigafilename;
	var pcFilename = req.body.pcfilename;
	var dryRun = req.body.dryrun;*/

	var cmdWrite = String.fromCharCode(115)+String.fromCharCode(116)+String.fromCharCode(111)+String.fromCharCode(114)+String.fromCharCode(101)+String.fromCharCode(4);
	port.write(cmdWrite,function () {
		console.log("Store file request sent");
		return ;
	});
});

/********** Start store binary data **********/
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
		console.log("Exit scritto");
	});
	
	res.end( "data" );
	/*port.close(function (err) {
		if (err) {
		    return console.log('Error opening port: ', err.message);
		 }
	});*/

});

var server = app.listen(8081,process.argv[3], function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Amiga alsfs server webApi listening at http://%s:%s", host, port)

});
server.timeout = 0;
}
