// recvFunct.js
// ========

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
		console.log(JSON.stringify(arrayConverted));
		customdata.res.end(JSON.stringify(arrayConverted) );
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
		var arrayConverted = converted.split('\n');
		if (arrayConverted.length<2)
		{
			console.log("Error, file not readable");
			customdata.res.status(404);
			customdata.res.end ();
		}
		else
		{
			var convertedObj={"st_size":arrayConverted[0],"blk_size":arrayConverted[1],"directory":arrayConverted[2],"days":arrayConverted[3],"minutes":arrayConverted[4],"seconds":arrayConverted[5]};
			customdata.res.end( JSON.stringify(convertedObj) );
		}
	}
  },
  storeRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");
	console.log("amiga file name: "+customdata.amigaFilename);
	console.log(data.toString().charCodeAt(0));

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
	//Send filesize	
	else if (data[0]==50 && data[1]==0 && data[2]==3)
	{
		const stats = fs.statSync(customdata.pcFilename);
		const fileSizeInBytes = stats.size;
		console.log("Sending file size "+fileSizeInBytes+"...");
			
		cmd=fileSizeInBytes.toString()+String.fromCharCode(4);
		console.log("sto per mandare"+cmd);
			
		customdata.port.write(cmd,function () {
			console.log("File size sent");
		});
	}
	// Send binary data
	else if (data[0]==51 && data[1]==0 && data[2]==3)
	{
		if (customdata.dryRun=="1") 	res.end( "Dryrun" );
		else
		{		
			console.log("Sending binary data for "+customdata.pcFilename);
			customdata.port.write(fs.readFileSync(customdata.pcFilename),function () {
				console.log("Binary data sent");
				customdata.res.end( "OK" );
			});
		}
	 }
  },
  // Start of store binary data
  storeBinaryRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");
	console.log("amiga file name: "+customdata.amigaFilename);
	console.log("Binary data base64 encoded: "+customdata.data);
	console.log(data.toString().charCodeAt(0));

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
			console.log("lunghezza",buf.length);
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
					customdata.res.end( "OK" );
				}
			});
		}
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
	}
	else
	{
		console.log("File not created");
		customdata.res.end( "KO" );
	}
  },
  createEmptyDrawerRecv: function (data,customdata) {
	console.log('aaaa Richiesta: #' + data+"##");
	console.log("amiga file name: "+customdata.amigaFilename);

	// Send drawer name
	if (data[0]==49 && data[1]==0 && data[2]==3)
	{
		console.log("Sending file name to create "+customdata.amigaFilename+"...");
		var cmd="";			
		for (var i=0;i<customdata.amigaDrawername.length;i++)
		{
			cmd+=customdata.amigaDrawername[i];
		}
		cmd+=String.fromCharCode(4);
			
		customdata.port.write(cmd,function () {
			console.log("File name sent to create empty file");
		});
			
	}
	// Send binary data
	else if (data[0]==79 && data[1]==75 && data[2]==0 && data[3]==3)
	{
		console.log("Drawer created");
		customdata.res.end( "OK" );
	}
	else
	{
		console.log("Drawer not created");
		customdata.res.status(404);
		customdata.res.end( "KO" );
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
		customdata.res.end( "OK" );
	}
	else
	{
		console.log("File Or Drawer not renamed");
		customdata.res.status(404);
		customdata.res.end( "KO" );
	}
  }
};

var zemba = function () {
}