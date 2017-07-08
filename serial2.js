var express = require('express');
var SerialPort = require('serialport');
var bodyParser = require('body-parser')

var app = express();
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })

var recvFunctions=require('./recvFunct.js');

var LISTVOLUMESCALLED=0;
var STORECALLED=0;
var LISTCONTENTCALLED=0;
var STATCONTENTCALLED=0;

//app.use(express.json());
var port = new SerialPort('/dev/virtualcom0',{baudRate:19200,dataBits:8,stopBits:1,parity:"none",rtscts:true,bufferSize:4096,autoOpen: true,parser: SerialPort.parsers.byteDelimiter([3])});
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

var server = app.listen(8081,'192.168.137.3', function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})
