/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is FireShare.
 *
 * The Initial Developer of the Original Code is Dennis Muhlestein
 * 
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

var p2pShareClient = {

	p2plog:function(msg) {
		dump('\n'+msg);
	},
	
	server:null,
	onSocketAccepted: function ( socket, transport ) {
		try {
			  var outstream = transport.openOutputStream(0,0,0);
			  var stream = transport.openInputStream(0,0,0);
			  var instream =    Components.classes["@mozilla.org/scriptableinputstream;1"]
				.createInstance(Components.interfaces.nsIScriptableInputStream);
			  instream.init(stream);
			} catch (e) {
			  alert("Error "+e);
			}
		var dataListener = {		
		  data : "",
		  post_re: RegExp("POST /peer_url\\sHTTP/1\\.[10](?:\\r\\n|\\n)(?:.+: .+(?:\\r\\n|\\n))*Content-Length: (.+)"+
			"(?:\\r\\n|\\n)(?:.+: .+(?:\\r\\n|\\n))*(?:\\r\\n|\\n)url=(.+)&peer_id=(.+)", 'm'),
		  peer_header_re: /X-FireShare-PeerRequest:\s(.+)\s/,
		  //return_count : 0,
		  //found_post : 0,
		  onStartRequest: function(request, context){ },
		  onStopRequest: function(request, context, status) {
			
			//p2pShareClient.p2plog ( "Peer Request Finished: " + this.data );
			
			this.close();
			//listener.finished(this.data);
		  }, 
		  // called when there are new data
		  onDataAvailable: function(request, context, inputStream, offset, count) {
			this.data += instream.read(count);
			var self=p2pShareClient;
			
			if(this.post_re.test(this.data)) {
			
				//We are finished reading the request if the content length has been read
				let len=this.data.replace( this.post_re, '$1' );
				let dat=this.data.replace( this.post_re, "url=$2&peer_id=$3" );
				//p2pShareClient.p2plog ( "Read length of " + len + "\nFound "+dat.length + " so far" );
				if (dat.length >= len) {
					//p2pShareClient.p2plog ( 'matched post' );
					let post_data=this.data.replace ( this.post_re, "$2 $3" ).split(' ');
					let url=unescape(post_data[0]), peer=unescape(post_data[1]);
					self.p2plog ( "Post data received from "+peer );
										
					self.peer_visit ( peer, url );
					let urlId=self.urlMap[url]; // always exists after peer_visit
						
					let sendPeers=[]; // peers to send back to client
					let res=this.peer_header_re.exec(this.data);
					if (res) {
						// urlMap[url] should always be ok because the url we got was from an incomming peer
						// that caused the peer_visit function to be called.						
						let needPeers = new Number(res[1]);
						
						self.url_peers[self.urlMap[url]].forEach(
						 function(p) {
						  if (p != peer && !self.error_peers[p] && sendPeers.length < needPeers) {
						   sendPeers.push(p);
						  }
						 }
						);
					
					} else {
						self.p2plog ( "No X-FireShare Header" );
					}
					
					// check which URLs to send back
					// if this client has visited the URL being sent, then the client sending URL is
					// interested in our other URLs
					// by default send the 5 before and 5 after the url being submitted
					let sendStem=5;
					let sendUrls = [];					
					let idx=self.local_visits.indexOf(urlId);
					if (idx>=0) {
						if (!self.peer_sent[peer]) self.peer_sent[peer]=[];
						for (let i=idx-sendStem;i<idx;++i) {
							let u=self.local_visits[i];
							if (i>=0 && self.peer_sent[peer].indexOf(u)<0) {
								sendUrls.push(self.urlIdMap[u]);
								self.peer_sent[peer].push(u);
							}
						}
						for (let i=idx+1;i<=idx+sendStem&&i<self.local_visits.length;++i){
							let u=self.local_visits[i];
							if (self.peer_sent[peer].indexOf(u)<0) {
								sendUrls.push(self.urlIdMap[u]);
								self.peer_sent[peer].push(u);
							}
						}
					} 
					
					// check if we have any association rules involving this URL
					let sendRules=[];
					self.rules_list.forEach(
						function(r) {
							r.antecedent.forEach(
								function(i) {	
									if (i==urlId && self.peer_sent[peer].indexOf(i) < 0)
										sendRules.push(r);
								}
							);
						}
					);
					
					// plain text safer than trying to eval javascript
					var resp="version 0.2.5";
					sendPeers.forEach(function(p){ resp += "\npeer "+p});					
					sendUrls.forEach(function(u) { resp += '\nurl '+escape(u)});
					sendRules.forEach(function(r) { 						
						let s='';
						
						r.antecedent.forEach(function(i) {
							s += escape(self.urlIdMap[i]);
							s += ' ';
						});
						s += '=> ';
						s += escape(self.urlIdMap[r.consequent]);
						s += ' | ' + new Number(r.confidence).toFixed(2) + ' ' + r.support;						
						resp += '\nrule '+s;
					});
					
					var webpage = "HTTP/1.1 200 OK\r\nContent-type: text/plain\r\nConnection: close\r\n" +
					  "Content-Length: "+resp.length+"\r\n\r\n"+resp;
					// Send webpage to browser/telnet
					p2pShareClient.p2plog ( "Sending back to "+peer+": "+resp );
					outstream.write(webpage, webpage.length);
					this.close()

					
					if (self.error_peers[peer]) {
						delete self.error_peers[peer];
						// doing this because it may be that the peer was offline and has come back online
						delete self.peer_sent[peer];
					}
					
				} else {
					p2pShareClient.p2plog ( "Waiting for more data.." );
				}
				
			} else { // test for invalidity
				//p2pShareClient.p2plog ( "Request so far: " + this.data );
				if ( 
					(this.data.length > 4 && !/^POST/.test(this.data)) ||
					(this.data.length > 14 && !/^POST \/peer_url/.test(this.data)) ||
					(/(\r\n|\n){2}/.test (this.data) && 
						(!/^POST \/peer_url/.test(this.data) ||
						 !/Content-Length: .+(?:\r\n|\n)/.test(this.data))) ||
					(/(\r\n|\n){2}.*=/.test(this.data) && !/(\r\n|\n){2}url=/.test ( this.data ))
				) {
					p2pShareClient.p2plog ( 'Invalid... Closing peer request.' );
					p2pShareClient.p2plog ( 'Request: '+this.data + '\n\n' );
					this.close();
				}
				
			}
		  },
		  close: function() {
			instream.close()
			outstream.close();
		  }
		};
		// pump takes in data in chunks asynchronously
		var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"]
			.createInstance(Components.interfaces.nsIInputStreamPump);
		pump.init(stream, -1, -1, 0, 0, true);
		pump.asyncRead(dataListener,null);
	},
	
	onStopListening: function ( socket, reason ) {
		this.p2plog ( 'Socket no longer in listen mode.' );
	},
		
	
	/*additionalPeerRequest: function(data,url,peer) {		
		var peer_header_re=/X-FireShare-PeerRequest:\s(.+)\s/;		
		this.p2plog ( "Check for additional peer request from "+peer);
		//this.p2plog ( "Posted Data: "+data );
		var res=peer_header_re.exec(data);
		if (res) {
			// urlMap[url] should always be ok because the url we got was from an incomming peer
			// that caused the peer_visit function to be called.
			this.p2plog ( "Send some active peers back." );
			var needPeers = new Number(res[1]);
			var a=0;
			var self=this;
			this.url_peers[this.urlMap[url]].forEach(
			 function(p) {
			  if (p != peer && !self.error_peers[p] && a < needPeers) {
			   ++a;
			   self.peerPost ( peer, url, p );
			  }
			 }
			);
		
		} else {
			this.p2plog ( "No X-FireShare Header" );
		}
	}, */
	
	p2pOnline: false,
	prefs:null,
	share_server: null,
	report_address: null,
	auto_detect_ipaddr: null,
	client_port: null,
	include_non_filtered_urls: null,
	url_filters: null,
	send_test_data: null,
	peer_id: null, // set by the share server in case auto detect is on
	targetPeersPerUrl: 5, // hard code in preparation for 0.3 having a configurable preference for this
	
	initPref:function(pref) {
		try {
			switch(pref) {
				case "enabled":					
					{
						var enabled=this.prefs.getBoolPref ( 'enabled' );
						if (this.p2pOnline != enabled ) {
							if ( enabled ) {
								this.createServer(); 
							} else {
								this.shutdown();
							}
						}
					}
					break;
				case "ipaddress":
					this.report_address = this.prefs.getCharPref("ipaddress");         
					break;
				case "share_server":
					this.share_server = this.prefs.getCharPref("share_server");
					break;
				case "auto_detect_ipaddr":
					this.auto_detect_ipaddr=this.prefs.getBoolPref("auto_detect_ipaddr");
					break;
				case 'include_non_filtered_urls':
					this.include_non_filtered_urls=this.prefs.getBoolPref('include_non_filtered_urls');
					break;
				case 'url_filters':
					{
						var pref_filters=this.prefs.getCharPref('url_filters');
						if (!pref_filters || pref_filters.length==0)
							this.url_filters=[];
						else
							this.url_filters=pref_filters.split('\n');
					}
					break;
				case "client_listen_port":
					{
						var tmpPort=this.client_port;
						this.client_port=this.prefs.getIntPref('client_listen_port');
						if (tmpPort != this.client_port && this.server != null) {
							if (this.p2pOnline){
								this.shutdown();
								this.createServer();
							}
						}
					}
					break;
				case "test_participate":
					this.send_test_data = this.prefs.getBoolPref ( 'test_participate' );
					break;
			}
		} catch ( e ) {
			this.p2plog ( "Exception initializing pref: " + e );
		}
	},
	
	createServer: function() {
		if (this.p2pOnline) {
			this.p2plog ( "Client already online!" );
			throw "Client already online";
		}
		try {
			//create a global server for receiving events
			this.server = Components.classes["@mozilla.org/network/server-socket;1"]
								 .createInstance(Components.interfaces.nsIServerSocket);
			this.server.init ( this.client_port, false, -1 );
			this.server.asyncListen ( this );
			
			this.p2pOnline=true;
		} catch ( e ) {
			this.p2plog(e);
		}
	},
	
	init: function() {
		this.p2plog ( "FireShare Init" );
		
		this.prefs=Components.classes["@mozilla.org/preferences-service;1"]
	         .getService(Components.interfaces.nsIPrefService)
	         .getBranch("extensions.p2pshare.");
	    this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
	    this.prefs.addObserver("", this, false);
		this.initPref('share_server');
		this.initPref('ipaddress');
		this.initPref('client_listen_port');
		this.initPref('auto_detect_ipaddr');
		this.initPref('include_non_filtered_urls');
		this.initPref('url_filters');	
		this.initPref('test_participate');
		this.initPref('enabled');
		if (this.prefs.getBoolPref ( 'firstrun' ) && this.p2pOnline) {
			gBrowser.selectedTab = gBrowser.addTab ( 'chrome://fireshare/content/firstrun.xul' );			
		}
			
		this.version = p2pExtVersion();
		
	},
	
	observe: function(subject, topic, data) {
		if (topic != "nsPref:changed") return;
		this.initPref(data);
	},
	
	shutdown: function() {
		this.p2plog ( "\nClient unload" );
		try {
			this.server.close();
			this.p2pOnline=false;
		} catch ( e ) {
			this.p2plog(e);
		}
	},
	
	next_post_id: 1,
	//post_objs: {},
	httpPost: function(url,stream,onReady,onError) {
		//this.p2plog ( 'Post Arguments: ' + arguments );
		var self=this;
		var post_id=this.next_post_id++;
	    var xmlhttp = new XMLHttpRequest(); 
	    xmlhttp.open("POST", url, true);     
	    xmlhttp.onreadystatechange=function(){ 
			try {
				//self.p2plog ( "("+post_id+") readyState: "+xmlhttp.readyState );
		        if(xmlhttp.readyState==4){ 
					var status=0;
					try { // I noticed on Windows XP, that getting status throws an error 
						status=xmlhttp.status;
					} catch (e) {
						self.p2plog ( "("+post_id+") Error" );
					}
		            if (status==200) {onReady(xmlhttp.responseText);} 
		            else {
						var statusText = "Error with Request" ;
						try { statusText = xmlhttp.statusText; } catch ( e ) {
							self.p2plog ( "("+post_id+") No Status Text" );
						}
						onError('('+post_id+') '+statusText);
					} 
		        } 
			} catch ( e ) {
				self.p2plog ( "("+post_id+") xmlhttp error: " + e.message );
			}
	    }; 
	    xmlhttp.setRequestHeader ( 'Content-type', 'application/x-www-form-urlencoded' );
	    xmlhttp.setRequestHeader ( 'Content-length', stream.length );
	    if (arguments.length>4) {
	     for (prop in arguments[4])
	      xmlhttp.setRequestHeader ( prop, arguments[4][prop] );
	    } 
	    xmlhttp.send(stream); 
		//var post_id=next_post_id++;
		//post_objs[post_id] = xmlhttp;
		
		setTimeout ( function() {
			//self.p2plog ( "Checking Post: "+xmlhttp.readyState )
			if (xmlhttp.readyState == 1 ) { // this means that send() has not yet been called.  Possible Can't Connect
				xmlhttp.abort();
				onError("Aborted.. Taking Too Long");
				//self.p2plog ( "("+post_id+") Should see a timeout..." );
			}
		}, 5000 );
	} ,
	
	error_peers: {},
	peerPost: function ( peer, href, ignoreError ) {
		if (this.error_peers[peer] && !ignoreError) {
			this.p2plog ( "Peer: "+peer+" in Error State.. Skipping Post" );
			return;
		}
		this.p2plog ( "Attempt peer post: "+ peer );
		var self=this;
		
		// how many active peers do we still need for this url?
		var doHeader={};
	
		let (plist=this.url_peers[href]) {
			var a=0; // check each peer in plist for active status
			if (plist) { 
				plist.forEach(function(p) {
					if (!self.error_peers[p])
						++a; // peer is in active state
				});
			}
			if (a < this.targetPeersPerUrl) {
				doHeader = {'X-FireShare-PeerRequest':this.targetPeersPerUrl - a};
			}
		}
	 
		
		this.httpPost (
			'http://'+peer+'/peer_url',
			'url='+escape(href)+'&peer_id='+escape( self.peer_id ),
			function(responseText) {
				self.p2plog ( "Response from peer "+peer+": "+responseText );
				// posting to peer worked
				
				// if peer is using 0.2.5+, response contains data
				if ( /^version 0\.2\.5/.test(responseText) ) {
					try {
						// this client should be able to understand 0.2.* version
						let res=responseText.split( /(?:\n|\r\n)/ );
						res.forEach(
							function(i) {
								// each line is name val
								let l=i.split(' ');
								if (l.length==2) {
									switch (l[0]) {
										case 'peer':
											// this is a peer that visited the same url we did and is active (at least according to this peer)
											self.peer_visit(l[1],href);
											break;
										case 'url':
											// this is a url that peer visited in addition to the url we posted to them
											self.peer_visit(peer,unescape(l[1]));
									}
								} else {
									// format url1 url2 => url confidence support
									if (l.length>2 && l[0] == 'rule') {
										let set=[];										
										for (let r=1;r<l.length-4;++r) {
											let url=unescape(l[r]);
											if (!self.urlMap[url]) self.urlMap[url] = ++self.nextUrlId;
											let urlId=self.urlMap[urlId];
											set.push(urlId);
										}
										let len=l.length;
										let aurl=unescape(l[l.length-3]);
										if (!self.urlMap[aurl]) self.urlMap[aurl] = ++self.nextUrlId;
										let a=self.urlMap[aurl];
										let c=l[length-2];
										let s=l[length-1];
										
										let childcs=new CandidateSet();
										childcs.ref_count=s; // support
										childcs.set=set;
										let parentcs=new CandiateSet();
										parentcs.ref_count = childcs.ref_count * c; // confidence  * child ref is parent ref
										parentcs.set = childcs.set.concat(a);
										
										let r=new AssociationRule(childcs,parentcs);
										self.peer_rules.push(r);
									}
								}
							}
						);
					} catch ( e ) {
						self.p2plog ( "Error evaluating peer response: "+e.message );
					}
				} else {
					self.p2plog ( "Received older response from peer." );
				}
				
				if (self.error_peers[peer]) {
					delete self.error_peers[peer];
					self.peer_sent[peer] = [];
				}
				if (!self.peer_sent[peer]) self.peer_sent[peer]=[];
				if (self.peer_sent[peer].indexOf(self.urlMap[href])<0)
					self.peer_sent[peer].push(self.urlMap[href]);
			},
			function(text) {
				self.error_peers[peer]=true;
				self.onError(text);
			},
			doHeader 
		);
	},
	
	onError: function(text) {	
		p2pShareClient.p2plog ( text );
	},
	
	/**
		Test href to see if it is ok to send to Coordination server.
	**/
	filter: function(href) {
		
		// filter https/other protocols/about pages
		if ( !/^http:/.test(href)) return false;
		
		// Check Preference Filters
		
		for (var i=0;i<this.url_filters.length;++i) {
			var f=this.url_filters[i];
			if (f.length == 0) continue;
			var negative=false;
			if (f.charAt(0)=='!') {
				negative=true;
				f=f.substr(1);
			}
			
			f=f.replace ( /\./g, "\\." );
			f=f.replace ( /\*/g, ".*" );
			f=f.replace ( /\?/g, "\\?" );
			this.p2plog ( "Check href:"+href+" against: "+f );
			var re=new RegExp(f);
			if ( re.test(href) ) {
				return !negative;
			}
		}
		
		return this.include_non_filtered_urls;
		
	},
	
	tweakURLForSharing: function(href) {
		
		var newh = href.replace ( /(.*);.*/, '$1' ); // strip path elements if any
		newh = newh.replace ( /(.*)#.*/, '$1' );  // strip named anchors
		return newh;
	},
	
	sendUrl: function(href) {
		this.p2plog ( "sending url: "+href );
		//this.p2plog ( "Share Server: " + this.share_server );
		var self=this;
		this.httpPost ( 
			this.share_server+'/visit', 
			"url="+escape(href) + 
			(this.auto_detect_ipaddr ? '' : '&peer_addr='+this.ipaddress) +
			"&peer_port="+this.client_port,
			function(text) {
				self.p2plog( "Reponse from share server: " + text );
				var jsonobj = eval('('+text+')');
				self.peer_id=jsonobj.peer_id;
				for ( var i=0;i<jsonobj.peers.length; ++i ) {
					let peer=jsonobj.peers[i];
					self.peer_visit( peer, href);
					// put peer out of error state since they are fresh from CS
					if (self.error_peers[peer])
						delete self.error_peers[peer];
				}
				self.sendToPeers(href);
			},
			this.onError );
	
	},
	
	/* urlsend: function() {
		this.sendUrl(content.window.location.href);
	}, */
	
	sendToPeers: function(href) {
		var self=this;
		this.peer_list.forEach(
			function(p) {
				if (!self.peer_sent[p]) self.peer_sent[p]=[];
				// send to the peer even if the peer has visited the resource so the peer can mine rules appropriately with our information
				// check if we have already sent the url to the peer
				if ( self.peer_sent[p].indexOf(self.urlMap[href])< 0 ) {				
					self.peerPost ( p, href );
				}
			}
		);
	},
	
	
	onPageLoad: function(href) {
		if (!this.p2pOnline) return;		
		
		if (this.filter(href)) {
			let(href=this.tweakURLForSharing(href)) {
				this.p2plog ( "Page for Sharing: " + href );
				this.localVisit(href);
			}
		}
	},
	
	statusBlink: null,
	doBlink: function() {
		let (sbstatus=document.getElementById ( 'p2pShareStatusBar' ).getAttribute ('status') ) {
			document.getElementById('p2pShareStatusBar').setAttribute('status',
				sbstatus=='on' ? 'blink' : 'on' );
		}
	},
	
	
	doTest: function() {
		//this.urlMap={}; // reset
		//this.urlIdMap={};
		for (let x=1;x<300;x++) {
			this.urlMap[x]=x;
			this.urlIdMap[x]=x;
		}
		
		this.local_visits='3,7,9,12,13,14,15,19,26,28,29,30,32,33,34,36,37,42,68,71,73,75,76,95,98,100,103,107,123'.split(',');
		let dat="70.236.234.130:7055: 1,10,101,102,104,105,11,112,113,114,116,119,120,121,16,17,18,2,20,21,22,23,24,25,27,31,4,43,44,45,46,47,48,5,50,51,52,53,54,55,56,57,58,59,6,60,61,64,66,69,70,74,77,78,8\n67.190.213.76:7055: 3\n208.53.56.43:7057: 123,14,3,36,37,7,76,9\n208.53.56.43:7055: 14,19,3,34,36,7,9\n208.53.56.43:7056: 12,123,7,76,9\n52.129.8.49:7055: 26,29\n193.151.54.135:7055: 26\n64.252.137.57:7055: 107,26\n68.17.140.151:80: 28,75\n24.198.83.86:7055: 107,28,42\n189.153.81.222:7055: 33\n87.69.101.44:7055: 33\n83.118.196.61:7055: 33\n201.95.72.10:7055: 34,35,38,39,40,41,49,62,63,65,67,72\n67.50.47.26:7056: 103,36,37\n207.230.140.240:7055: 37,75\n216.52.210.36:7055: 124,125,126,127,128,129,130,131,132,133,137,138,141,144,145,146,147,148,149,150,151,152,156,158,160,163,164,165,166,167,168,42,68,79,80\n74.110.1.132:7055: 42,68,73,75\n72.16.198.178:7055: 107,68,71,98\n166.70.207.2:7055: 15,33\n80.192.159.152:7055: 76\n155.100.17.184:7055: 79,80\n71.215.148.98:7055: 106,109,110,111,82,83,84,85,86,87,88,90,91,99\n74.132.116.174:7055: 98\n85.144.18.119:7055: 108\n24.107.208.84:7055: 115,117,118,122,134,135,136,139,140,142,143\n80.4.203.5:4714: 117,153,154,155,157,159,161,162\n89.139.232.21:7055: 7".split('\n');
		for (x in Iterator(dat)) {
			let pos=x[1].lastIndexOf(':');
			let peer=x[1].substr(0,pos);
			let data = x[1].substr(pos+1);
			for (y in Iterator(data.split(','))) 
				this.peer_visit(peer,y[1]);
		}	
	}
	
}













