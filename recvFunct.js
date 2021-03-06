// recvFunct.js
// ========

var server = require('./amigajsserver');
var fs = require('fs');

module.exports = {
  listVolumesRecv: function (data,customdata) {
    console.log('Volumes: ' + data);
	var cont=0;
	var converted="";
	while ( data[cont]!=3 )
	{
		if (data[cont]) converted+=String.fromCharCode(data[cont]);
		cont++;
	}
	var arrayConverted = converted.split('\n');
	arrayConverted = arrayConverted.filter(function(entry) { return entry.trim() != ''; });
	customdata.end( JSON.stringify(arrayConverted ));
	server.TERMINAL_READY=true;
  },
  listDevicesRecv: function (data,customdata) {
    console.log('Devices: ' + data);
	var cont=0;
	var converted="";
	while ( data[cont]!=3 )
	{
		if (data[cont]) converted+=String.fromCharCode(data[cont]);
		cont++;
	}
	var arrayConverted = converted.split('\n');
	arrayConverted = arrayConverted.filter(function(entry) { return entry.trim() != ''; });
	customdata.end( JSON.stringify(arrayConverted ));
	server.TERMINAL_READY=true;
  },
  listFloppiesRecv: function (data,customdata) {
    console.log('Floppies: ' + data);
	var cont=0;
	var converted="";
	while ( data[cont]!=3 )
	{
		if (data[cont]) converted+=String.fromCharCode(data[cont]);
		cont++;
	}
	var arrayConverted = converted.split('\n');
	arrayConverted = arrayConverted.filter(function(entry) { return entry.trim() != ''; });
	var arrayFloppy = [];
	for (var i=0;i<arrayConverted.length;i++)
	{
		if (/^DF[0-9]$/.test(arrayConverted[i]))
		{
			arrayFloppy.push(arrayConverted[i]);
		}
	}
	customdata.end( JSON.stringify(arrayFloppy));
	server.TERMINAL_READY=true;
  },
  listContentRecv: function (data,customdata) {
    console.log('Content: ' + data);
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		console.log("Sending file name "+customdata.path+"...");
		var cmd="";			
		for (var i=0;i<customdata.path.length;i++)
		{
			cmd+=customdata.path[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("File name sent to list content");
		});
			
	}
	else
	{

		var cont=0;
		var converted="";
		while ( data[cont]!=3 )
		{
			if (data[cont]) converted+=String.fromCharCode(data[cont]);
			cont++;
		}

		console.log(converted);
		var arrayConverted = converted.split('\n');
		arrayConverted = arrayConverted.filter(function(entry) { return entry.trim() != ''; });
		// per ogni record di arrayConverted prendo le parole e le metto in un oggetto globale insieme a customdata.path e poi elimino le prime 6 parole cosi che rimanga solo l'ultima cioè il nome del file
		for (var i=0;i<arrayConverted.length;i++)
		{
			var newObject = arrayConverted[i].split(' ');
			console.log(newObject);
			arrayConverted[i]=arrayConverted[i].substring(newObject[0].length+newObject[1].length+newObject[2].length+newObject[3].length+newObject[4].length+newObject[5].length+6);
			//server.STATCACHE[customdata.path+"/"+arrayConverted[i]]=newObject;
			server.STAT_CACHE.set( customdata.path+"/"+arrayConverted[i], newObject, function( err, success )
			{
				if( !err && success )
				{
				  console.log( customdata.path+"/"+arrayConverted[i]+" cached" );
				}
			});
		}
		console.log(JSON.stringify(arrayConverted));
		customdata.res.end(JSON.stringify(arrayConverted) );
		server.TERMINAL_READY=true;
	}
  },
  statRecv: function (data,customdata) {
	console.log('Content: ' + data);
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		console.log("Stat for resource "+customdata.path+"...");
		var cmd="";			
		for (var i=0;i<customdata.path.length;i++)
		{
			cmd+=customdata.path[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("File name sent to stat");
		});		
	}
	else
	{
		var cont=0;
		var converted="";
		
		while ( data[cont]!=3 )
		{
			if (data[cont]) converted+=String.fromCharCode(data[cont]);
			cont++;
		}
		var arrayConverted = converted.split(' ');
		if (arrayConverted.length<2)
		{
			console.log("Error, file not readable");
			customdata.res.status(404);
			customdata.res.end ();
			server.TERMINAL_READY=true;
		}
		else
		{
			var convertedObj={"st_size":arrayConverted[0],"blk_size":arrayConverted[1],"directory":arrayConverted[2],"days":arrayConverted[3],"minutes":arrayConverted[4],"seconds":arrayConverted[5]};
			var newObject=[];
			for (var i=0;i<6;i++)
				newObject.push(arrayConverted[i]);

			//server.STATCACHE[customdata.path]=newObject;
			server.STAT_CACHE.set( customdata.path, newObject, function( err, success )
			{
				if( !err && success )
				{
				  console.log( customdata.path+"/"+arrayConverted[i]+" cached" );
				}
			});
			customdata.res.end( JSON.stringify(convertedObj) );
			server.TERMINAL_READY=true;
		}
	}
  },
  statfsRecv: function (data,customdata) {
	console.log('Content: ' + data);
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		console.log("Statfs for resource "+customdata.path+"...");
		//console.log(server.STATCACHE[customdata.path]);
		var cmd="";			
		for (var i=0;i<customdata.path.length;i++)
		{
			cmd+=customdata.path[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("File name sent to statfs");
		});		
	}
	else
	{
		var cont=0;
		var converted="";
		
		while ( data[cont]!=3 )
		{
			if (data[cont]) converted+=String.fromCharCode(data[cont]);
			cont++;
		}
		var arrayConverted = converted.split(' ');
		if (arrayConverted.length<2)
		{
			console.log("Error, statfs not readable");
			customdata.res.status(404);
			customdata.res.end ();
			server.TERMINAL_READY=true;
		}
		else
		{
			var convertedObj={"blksize":parseInt(arrayConverted[0]),"numblocks":parseInt(arrayConverted[1]),"numblocksused":parseInt(arrayConverted[2])};
			customdata.res.end( JSON.stringify(convertedObj) );
			server.TERMINAL_READY=true;
		}
	}
  },
  // Start of store binary data
  storeBinaryRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");
	console.log("amiga file name: "+customdata.amigaFilename);
	//console.log("Binary data base64 encoded: "+customdata.data);
	//console.log(data.toString().charCodeAt(0));

	// Send filename
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		console.log("Sending file name "+customdata.amigaFilename+"...");
		var cmd="";			
		for (var i=0;i<customdata.amigaFilename.length;i++)
		{
			cmd+=customdata.amigaFilename[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("File name sent to store");
		});
			
	}
	//Send binary size	
	else if (data[0]==50 && data[1]==0 && data[2]==3)
	{
		const fileSizeInBytes = customdata.size;
		console.log("Sending file size "+fileSizeInBytes+"...");
			
		cmd=fileSizeInBytes.toString()+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("File size sent");
		});
	}
	//Send offset flag	
	else if (data[0]==51 && data[1]==0 && data[2]==3)
	{
		console.log("Sending offset flag "+customdata.offset+"...");
		
		if (customdata.offset.toString()=="0")
			cmd="0"+String.fromCharCode(4);
		else
			cmd="1"+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("File size sent");
		});
	}
	// Send binary data
	else if (data[0]==52 && data[1]==0 && data[2]==3)
	{
		if (customdata.dryRun=="1") 	res.end( "Dryrun" );
		else
		{	
			// Decode base64
			//var buf="";
			const buf = new Buffer(customdata.data, 'base64');
			//console.log("Sending binary data "+buf);
			console.log("lunghezza del buffer che sto per mandare...",buf.length);

			if (customdata.size!=buf.length)
			{
				fs.writeFile("/tmp/testcodificato", customdata.data, function(err) {
				    if(err) {
				        return console.log(err);
				    }
					console.log("The file was saved!");
				}); 
				fs.writeFile("/tmp/testdecodificato", buf, function(err) {
				    if(err) {
				        return console.log(err);
				    }
					console.log("The file was saved!");
				}); 
			}
			//console.log("lunghezza",buf.toString('binary').length);
			/*for (var z=0;z<buf.length;z++)
			{
				console.log(z+"-"+buf.toString('binary').charCodeAt(z));
			}*/
			customdata.port.write(new Buffer(customdata.data, 'base64'),function (err) {
				if (err) console.log('Error on write: ', err.message);
				else
				{
					console.log("Binary data sent");
				}
			});
		}
	 }
	 else if (data[0]==53 && data[1]==0 && data[2]==3)
	 {
	 	console.log("Got confirmation that binary data is sent, http response outgoing...");
	 	server.STAT_CACHE.del(customdata.amigaFilename);
	 	customdata.res.end( "OK" );
	 	server.TERMINAL_READY=true;
	 }
	 else if (data[0]==54 && data[1]==0 && data[2]==3)
	 {
	 	console.log("Trasmission error occured, starting over...");
	 	var cmdWrite = String.fromCharCode(115)+String.fromCharCode(116)+String.fromCharCode(111)+String.fromCharCode(114)+String.fromCharCode(101)+String.fromCharCode(114)+String.fromCharCode(97)+String.fromCharCode(119)+String.fromCharCode(4);
		customdata.port.write(cmdWrite,function () {
			console.log("Store binary data request sent");
			return ;
		});
	 }
  },
  createEmptyFileRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");
	console.log("amiga file name: "+customdata.amigaFilename);

	// Send filename
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		console.log("Sending file name to create "+customdata.amigaFilename+"...");
		var cmd="";			
		for (var i=0;i<customdata.amigaFilename.length;i++)
		{
			cmd+=customdata.amigaFilename[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("File name sent to create empty file");
		});
			
	}
	// Send binary data
	else if (data[0]==79 && data[1]==75 && data[2]==0 && data[3]==3)
	{
		console.log("File created");
		customdata.res.end( "OK" );
		server.TERMINAL_READY=true;
	}
	else
	{
		console.log("File not created");
		customdata.res.end( "KO" );
		server.TERMINAL_READY=true;
	}
  },
  createEmptyDrawerRecv: function (data,customdata) {
	console.log('Request: #' + data+"##");
	console.log("Amiga drawer name: "+customdata.amigaDrawername);

	// Send drawer name
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		console.log("Sending file name to create "+customdata.amigaDrawername+"...");
		var cmd="";			
		for (var i=0;i<customdata.amigaDrawername.length;i++)
		{
			cmd+=customdata.amigaDrawername[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("Drawer name sent to create empty drawer");
		});
			
	}
	// Send binary data
	else if (data[0]==79 && data[1]==75 && data[2]==0 && data[3]==3)
	{
		console.log("Drawer created");
		customdata.res.end( "OK" );
		server.TERMINAL_READY=true;
	}
	else
	{
		console.log("Drawer not created");
		customdata.res.status(404);
		customdata.res.end( "KO" );
		server.TERMINAL_READY=true;
	}
  },
  renameFileOrDrawerRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");
	console.log("amiga file name: "+customdata.amigaFilename);

	// Send old name
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		console.log("Sending old filename "+customdata.amigaOldFilename+"...");
		var cmd="";			
		for (var i=0;i<customdata.amigaOldFilename.length;i++)
		{
			cmd+=customdata.amigaOldFilename[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("File name sent to create empty file");
		});
			
	}
	// Send old name
	else if (data[0]==50 && data[1]==0 && data[2]==3)
	{
		console.log("Sending new filename "+customdata.amigaNewFilename+"...");
		var cmd="";			
		for (var i=0;i<customdata.amigaNewFilename.length;i++)
		{
			cmd+=customdata.amigaNewFilename[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("File name sent to create empty file");
		});
			
	}
	// Send binary data
	else if (data[0]==79 && data[1]==75 && data[2]==0 && data[3]==3)
	{
		console.log("File or Drawer renamed");
		console.log("Remove "+customdata.amigaOldFilename+ " from cache");
		server.STAT_CACHE.del(customdata.amigaOldFilename);
		customdata.res.end( "OK" );
		server.TERMINAL_READY=true;
	}
	else
	{
		console.log("File Or Drawer not renamed");
		customdata.res.status(404);
		customdata.res.end( "KO" );
		server.TERMINAL_READY=true;
	}
  },
  readFileRecv: function (data,customdata) {
	//console.log('aaaa Richiesta: #' + data+"##");
	//console.log("amiga file name: "+customdata.amigaFilename);

	// Send old name
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		console.log("Sending filename "+customdata.amigaFilename+"...");
		var cmd="";			
		for (var i=0;i<customdata.amigaFilename.length;i++)
		{
			cmd+=customdata.amigaFilename[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("File name sent to read file");
		});
			
	}
	// Send size
	else if (data[0]==50 && data[1]==0 && data[2]==3)
	{
		console.log("Sending size "+customdata.size+"...");
		var cmd="";			
		for (var i=0;i<customdata.size.length;i++)
		{
			cmd+=customdata.size[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("Size sent");
		});
			
	}
	// Send offset
	else if (data[0]==51 && data[1]==0 && data[2]==3)
	{
		console.log("Sending offset "+customdata.offset+"...");
		var cmd="";			
		for (var i=0;i<customdata.offset.length;i++)
		{
			cmd+=customdata.offset[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("Offset sent");
		});		
	}
	else
	{
		var cmd="";
		for (var i=0;i<data.length-1;i++)
			cmd+=String.fromCharCode(data[i]);
		console.log("command: "+cmd);
		console.log("File data received length: "+cmd.length);
		customdata.res.status(200);
		customdata.res.end( cmd );
		server.TERMINAL_READY=true;
		console.log("HTTP RESPONSE SENT!!");
	}
  },
  writeAdfRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");
	//console.log("amiga file name: "+customdata.amigaFilename);

	// Send old name
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{

		const trackDevice = customdata.trackDevice;
		console.log("Trackdevice "+trackDevice+"...");
			
		cmd=trackDevice.toString()+String.fromCharCode(4);
		console.log("sending"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("Trackdevice sent to read file");
		});
			
	}
	// Send start
	else if (data[0]==50 && data[1]==0 && data[2]==3)
	{

		const start = customdata.start;

		console.log("Sending start "+start+"...");
		cmd=start.toString()+String.fromCharCode(4);
		console.log("sending "+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("Start sent");
		});
			
	}
	// Send offset
	else if (data[0]==51 && data[1]==0 && data[2]==3)
	{
		const end = customdata.end;

		console.log("Sending end "+end+"...");
		cmd=end.toString()+String.fromCharCode(4);
		console.log("sending "+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("End sent");
		});		
	}
	else if (data[0]==52)
	{
		var cmd="";
		for (var i=0;i<data.length-1;i++)
			cmd+=String.fromCharCode(data[i]);

		var words = cmd.split(' ');
		
		console.log("Sending binary data for "+customdata.adfFilename);
		buffer = new Buffer(parseInt(words[2]));

		fs.open(customdata.adfFilename, 'r', function(err, fd) {
			if (err) throw err;
			fs.read(fd, buffer, 0 , parseInt(words[2]), parseInt(words[1]), function(err, nread) {
				console.log("Offset : ",parseInt(words[1]));
				console.log("Chunk size : ",parseInt(words[2]));
				console.log(buffer);
				console.log("BUffer printed");
				customdata.port.write(buffer,function () {
					console.log("Binary data sent");
					fs.close(fd);
				});
			});
		});
	}
	else if (data[0]==54 && data[1]==0 && data[2]==3)
	{
		customdata.res.status(404);
		customdata.res.end( '' );
		server.TERMINAL_READY=true;
		console.log("HTTP RESPONSE SENT!!");
	}
	else
	{
		customdata.res.status(200);
		customdata.res.end( cmd );
		server.TERMINAL_READY=true;
		console.log("HTTP RESPONSE SENT!!");
	}
  },
  writeAdfB64Recv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");
	//console.log("amiga file name: "+customdata.amigaFilename);

	// Send old name
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{

		const trackDevice = customdata.trackDevice;
		console.log("Trackdevice "+trackDevice+"...");
			
		cmd=trackDevice.toString()+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("Trackdevice sent to read file");
		});
			
	}
	// Send start
	else if (data[0]==50 && data[1]==0 && data[2]==3)
	{

		const start = customdata.start;

		console.log("Sending start "+start+"...");
		cmd=start.toString()+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("Start sent");
		});
			
	}
	// Send offset
	else if (data[0]==51 && data[1]==0 && data[2]==3)
	{
		const end = customdata.end;

		console.log("Sending end "+end+"...");
		cmd=end.toString()+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("End sent");
		});		
	}
	// da modificare
	else if (data[0]==52)
	{
		var cmd="";
		for (var i=0;i<data.length-1;i++)
			cmd+=String.fromCharCode(data[i]);

		var words = cmd.split(' ');
		
		console.log("Sending binary data ");
		//buffer = new Buffer(parseInt(words[2]));

		//const bufOrig = new Buffer(customdata.adfB64Data, 'base64');
		//bufOrig.copy(buffer,0,parseInt(words[1]),parseInt(words[2]));
		//console.log("Offset : "+parseInt(words[1])+"- Data length: "+parseInt(words[2]));
			//+" - Buffer length: "+buffer.toString().length+" - buffer:"+buffer.toString());
		//fs.writeFile("/tmp/testdecodificatochunk"+words[1], bufOrig.slice(parseInt(words[1]),parseInt(words[1])+parseInt(words[2])), function(err) {
		/*fs.writeFile("/tmp/testdecodificatochunk"+words[1], customdata.adfData.slice(parseInt(words[1]),parseInt(words[1])+parseInt(words[2])), function(err) {
				    if(err) {
				        return console.log(err);
				    }
					console.log("The file was saved!");
				});

		fs.writeFile("/tmp/testdecodificato", customdata.adfData, function(err) {
				    if(err) {
				        return console.log(err);
				    }
					console.log("The file was saved!");
				});*/

		customdata.port.write(customdata.adfData.slice(parseInt(words[1]),parseInt(words[1])+parseInt(words[2])),function () {
			console.log("Binary data sent");
		});
	}
	else if (data[0]==54 && data[1]==0 && data[2]==3)
	{
		customdata.res.status(404);
		customdata.res.end( '' );
		server.TERMINAL_READY=true;
		console.log("HTTP RESPONSE SENT!!");
	}
	else
	{
		customdata.res.status(200);
		customdata.res.end( cmd );
		server.TERMINAL_READY=true;
		console.log("HTTP RESPONSE SENT!!");
	}
  },
  readAdfRecv: function (data,customdata) {
	//console.log('aaaa Richiesta: #' + data+"##");
	//console.log("amiga file name: "+customdata.amigaFilename);

	// Send old name
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{

		const trackDevice = customdata.trackDevice;
		console.log("Trackdevice "+trackDevice+"...");
			
		cmd=trackDevice.toString()+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("Trackdevice sent to read file");
		});
			
	}
	// Send size
	else if (data[0]==50 && data[1]==0 && data[2]==3)
	{

		const size = customdata.size;

		console.log("Sending size "+size+"...");
		cmd=size.toString()+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("size sent");
		});
			
	}
	// Send offset
	else if (data[0]==51 && data[1]==0 && data[2]==3)
	{
		const offset = customdata.offset;

		console.log("Sending offset "+offset+"...");
		cmd=offset.toString()+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("offset sent");
		});		
	}
	else if (data[0]==52 && data[1]==0)
	{
		var cmd="";
		for (var i=2;i<data.length-1;i++)
			cmd+=String.fromCharCode(data[i]);

		customdata.res.status(200);
		console.log(cmd);
		customdata.res.end( cmd );
		server.TERMINAL_READY=true;
		console.log("HTTP RESPONSE SENT!!");	
	}
  },
  delayRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");

	// Send old name
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		console.log("Sending delay "+customdata.delay+"...");
		var cmd="";			
		for (var i=0;i<customdata.delay.length;i++)
		{
			cmd+=customdata.delay[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("Delay value sent");
		});
			
	}
	else
	{
		var cmd="";
		for (var i=0;i<data.length-1;i++)
			cmd+=String.fromCharCode(data[i]);
		console.log("Delay received: "+cmd);
		customdata.res.status(200);
		customdata.res.end( cmd );
		server.TERMINAL_READY=true;
	}
  },
  keypressRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");
	var cmd="";
	for (var i=0;i<data.length-1;i++)
		cmd+=String.fromCharCode(data[i]);
	console.log("Key pressed"+cmd);
	customdata.res.status(200);
	customdata.res.end( cmd );
	server.TERMINAL_READY=true;
  },
  testFloppyDiskRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");

	// Send old name
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		
		var cmd="";			
		
		const trackDevice = customdata.trackDevice;
		console.log("Trackdevice "+trackDevice+"...");
			
		cmd=trackDevice.toString()+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("Trackdevice value sent");
		});
			
	}
	else
	{
		var cmd="";
		for (var i=0;i<data.length-1;i++)
			cmd+=String.fromCharCode(data[i]);
		console.log("Drive received: "+cmd);
		customdata.res.status(200);
		customdata.res.end( cmd );
		server.TERMINAL_READY=true;
	}
  },
  relabelRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");

	// Send old name
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		
		var cmd="";			
		
		const oldVolumeName = customdata.oldVolumeName;
		console.log("Old volume name "+oldVolumeName+"...");
			
		cmd=oldVolumeName.toString()+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("Old volume name sent value sent");
		});
			
	}
	else if (data[0]==50 && data[1]==0 && data[2]==3)
	{
		
		var cmd="";			
		
		const newVolumeName = customdata.newVolumeName;
		console.log("New volume name "+newVolumeName+"...");
			
		cmd=newVolumeName.toString()+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("Old volume name sent value sent");
		});
			
	}
	else if (data[0]==51 && data[1]==0 && data[2]==3)
	{
		
		var cmd="";
		for (var i=0;i<data.length-1;i++)
			cmd+=String.fromCharCode(data[i]);
		console.log("Response received: "+cmd);
		customdata.res.status(200);
		customdata.res.end( cmd );
		server.TERMINAL_READY=true;
			
	}
	else if (data[0]==53 && data[1]==0 && data[2]==3)
	{
		var cmd="";
		for (var i=0;i<data.length-1;i++)
			cmd+=String.fromCharCode(data[i]);
		console.log("Response received: "+cmd);
		customdata.res.status(404);
		customdata.res.end( cmd );
		server.TERMINAL_READY=true;
	}
	else
	{
		var cmd="";
		for (var i=0;i<data.length-1;i++)
			cmd+=String.fromCharCode(data[i]);
		console.log("Response received: "+cmd);
		customdata.res.status(400);
		customdata.res.end( cmd );
		server.TERMINAL_READY=true;
	}
  },
  deleteFileRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");
	console.log("amiga file name: "+customdata.amigaFilename);

	// Send filename
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		console.log("Sending file name to delete "+customdata.amigaFilename+"...");
		var cmd="";			
		for (var i=0;i<customdata.amigaFilename.length;i++)
		{
			cmd+=customdata.amigaFilename[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("File name sent to create empty file");
		});
			
	}
	// Send binary data
	else if (data[0]==79 && data[1]==75 && data[2]==0 && data[3]==3)
	{
		console.log("File "+customdata.amigaFilename+" deleted");
		server.STAT_CACHE.del(customdata.amigaFilename);
		customdata.res.end( "OK" );
		server.TERMINAL_READY=true;
	}
	else
	{
		console.log("File not deleted");
		customdata.res.status(404);
		customdata.res.end( "KO" );
		server.TERMINAL_READY=true;
	}
  }
};
