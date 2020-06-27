const xr = Window.navigator.xr
let state = null;
let sock;

let log = document.getElementById( "log" );
let state_div = document.getElementById( "state" );

let msgs = [];

//  // 
{
  let container;

  let scene,
      camera,
      renderer,
      light,
      controls;

  let table, 
      floor, 
      grid;

  let userData,
      pivot,
      painter1,
      painter2,
      controller1,
      controller2;

  let cursor = new THREE.Vector3();

  let geometry = [
    new THREE.BoxBufferGeometry( 0.5, 0.8, 0.5 ),
    new THREE.PlaneBufferGeometry( 4, 4 ),
    new THREE.CylinderBufferGeometry( 0.01, 0.02, 0.08, 5 )
  ];

  let material = [
    new THREE.MeshStandardMaterial( {
      color: 0x444444,
      roughness: 1.0,
      metalness: 0.0
    } ),
    new THREE.MeshStandardMaterial( {
      color: 0x222222,
      roughness: 1.0,
      metalness: 0.0
    } ),
    new THREE.MeshStandardMaterial( { 
      flatShading: true 
    } )
  ];
}  

//  //

//  //*************************************** // SERVER // ********************************************//
function write( ...args ) {

  if( msgs.length > 15 ) {

    msgs.shift();
  
  }

  let msg = args.join( ", " );
  msgs.push( msg );
  let fMsg = msgs.join( "\n" );

  log.innerText = "";
  log.innerText +=  "Log: \n " + fMsg;
  
  console.log( msg );
}

function connect_to_server( opt, log ) {

	let self = {
    transport: opt.transport || "wss",
		hostname: opt.hostname || window.location.hostname,
		port: opt.port || window.location.port,
		protocols: opt.protocols || [],
		reconnect_period: 50000,
		reload_on_disconnect: true,
		socket: null,
  };
  
  self.addr = self.transport + '://' + self.hostname + ':' + self.port;
	
	let connect = function() {
  
    self.socket = new WebSocket( self.addr, self.protocols );
		self.socket.binaryType = 'arraybuffer';
    //self.socket.onerror = self.onerror;
    
		self.socket.onopen = function() {

			log( "websocket connected to " + self.addr );
			// ...
  
    }
  
    self.socket.onmessage = function( e ) { 
  
      if ( e.data instanceof ArrayBuffer ) {
  
        // if (onbuffer) {
				// 	//onbuffer(e.data, e.data.byteLength);
				// } else {

        log( "ws received arraybuffer of " + e.data.byteLength + " bytes" )

        //}

      } else {
  
        let msg = e.data;
				let obj;
  
        try {
  
          obj = JSON.parse( msg );
  
        } catch( e ) {}
  
        if ( obj.cmd == "newData" ) {
  
          state = obj.state;
  
				} else {
          
          log( "ws received", msg );
  
        }
			} 
		}
  
    self.socket.onclose = function( e ) {
  
      self.socket = null;

			setTimeout( function() {
  
        if ( self.reload_on_disconnect ) {
  
          window.location.reload( true );
  
        } else {
  
          log( "websocket reconnecting" );

					connect();
  
        }
			}, self.reconnect_period );		
  
      //if (onclose) onclose(e);
			log( "websocket disconnected from " + self.addr );
  
    }

		self.send = function( msg ) {
  
      if ( !self.socket ) { console.warn( "socket not yet connected" ); return; }
			if ( self.socket.readyState != 1 ) { console.warn( "socket not yet ready" ); return; }
			if ( typeof msg !== "string" ) msg = JSON.stringify( msg );
  
      self.socket.send( msg );
  
    }
	}

	connect();

	return self;
}

//  //*************************************** // INITIALIZE // ********************************************//

initialize();
animate();

function initialize() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x222222 );

  camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.01, 50 );
  camera.position.set( 0, 1.6, 3 );

  table = new THREE.Mesh( geometry[0], material[0] );
  table.position.y = 0.35;
  table.position.z = 0.85;
  scene.add( table );

  floor = new THREE.Mesh( geometry[1], material[1] );
  floor.rotation.x = - Math.PI / 2;
  scene.add( floor );

  grid = new THREE.GridHelper( 10, 20, 0x111111, 0x111111 );
  // grid.material.depthTest = false; // avoid z-fighting
  scene.add( grid );

  scene.add( new THREE.HemisphereLight( 0x888877, 0x777788 ) );

  light = new THREE.DirectionalLight( 0xffffff, 0.5 );
  light.position.set( 0, 4, 0 );
  scene.add( light );


  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.outputEncoding = THREE.sRGBEncoding;
  // renderer.vr.enabled = true; 
  renderer.xr.enabled = true;
  container.appendChild( renderer.domElement );

  document.body.appendChild( VRButton.createButton( renderer ) );
  window.addEventListener( 'resize', onWindowResize, false );

  try {
    sock = connect_to_server( {}, write );
  } catch ( e ) {
    console.error( e );
  }

}


function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
}

//  //*************************************** // ANIMATE // ********************************************//

function animate ()  {

  renderer.setAnimationLoop( render );

};

function render () {

  try {
		sock.send("getData");
	} catch(e) {
		write(e)
	}

	if (!state) return;
  let hand = state;
	state_div.innerText = JSON.stringify(hand, null, "  ");

  renderer.render( scene, camera );

};
