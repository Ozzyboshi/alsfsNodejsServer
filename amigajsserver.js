var express = require('express');
var SerialPort = require('serialport');
var bodyParser = require('body-parser')
var fs = require('fs');

var app = express();
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })

var recvFunctions=require('./recvFunct.js');

var LISTVOLUMESCALLED=0;
var STORECALLED=0;
var LISTCONTENTCALLED=0;
var STATCONTENTCALLED=0;


if (process.argv.length<4) {console.log("Usage: amigajsserver serialfile ip_to_bind (ex. amigajsserver /dev/ttyUSB0 192.168.137.3)");process.exit(1);}



// Start of bootstrap mode

if (process.argv.length==5 && process.argv[4]=="-bootstrap")
{
	var stage=0;
	console.log("Type 'type ser: to ram: setup on your amiga' and press c");
	/*port.write(fs.readFileSync("./volumes6"),function () {
		console.log("Bootstrap complete now type 'ram:setup' in your amiga");
	});*/
		var exec = require('child_process').exec;
		var execSync = require('child_process').execSync;
		var command="stty 9600 -parenb cs8 crtscts -ixon -ixoff raw iutf8  > "+process.argv[2]+" && cat receive.rexx > "+process.argv[2];
		var command="cat receive.rexx > /dev/virtualcom0";
  		var keypress = require('keypress');
			keypress(process.stdin);
			process.stdin.on('keypress', function (ch, key) 
			{
				//console.log('got "keypress"', key);
				if (key && key.ctrl && key.name == 'c') {
				 	process.stdin.pause();
    				}
				if (key.name == 'c') {
					console.log(stage);
					if (stage==0)
					{
						console.log("Send "+command);
						execSync(command);
						console.log("Press ctrl+c on your amiga and then press c in this terminal");
						stage=1;
					}
					else if (stage==1)
					{
						for (var i=0;i<16;i++)
						{
							command="echo '1234567890' > /dev/virtualcom0";
							//console.log("Send "+command);
							execSync(command);
						}
						console.log("Type rx ram:setup on your amiga and then press c in this terminal");
						stage=2;
					}
					else if (stage==2)
					{
						command="cat volumes6 > /dev/virtualcom0";
						//console.log("Mandoooo "+command);
						console.log("Set hardware control flow on your amiga serial preferences then type ram:volumes6 on your amiga and then press c in this terminal to exit");
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
/* versione per amiga vertuale */ var port = new SerialPort(process.argv[2],{baudRate:9600,dataBits:8,stopBits:1,parity:"none",rtscts:true,xon:true,xoff:true,bufferSize:4096,autoOpen: true,parser: SerialPort.parsers.byteDelimiter([3])});
// End of bootstrap mode
var amigaCmd="";
var Volumes="";
var RECVFUNCT=undefined;
var CUSTOMDATA=0;

port.on('data', function (data) {
	RECVFUNCT(data,CUSTOMDATA);
});


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

  console.log("Example app listening at http://%s:%s", host, port)

})
}
