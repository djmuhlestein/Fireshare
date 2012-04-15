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

p2pShareClient.urlMap={};
p2pShareClient.urlIdMap={};
p2pShareClient.nextUrlId=0;

p2pShareClient.local_visits=[]; // Array
p2pShareClient.peer_urls={}; // Map->Array
p2pShareClient.peer_list=[]; // list of peer addresses
p2pShareClient.url_peers={}; // reverse list that tracks number of peers visiting a specific url
p2pShareClient.rules_list=[];
p2pShareClient.peer_rules=[]; // rules coming in from a peer
p2pShareClient.peer_sent={}; // lists of urls we sent to peers

p2pShareClient.localVisit=function(href) {
	if (!this.urlMap[href]) {
		this.urlMap[href]= ++this.nextUrlId;
		this.urlIdMap[this.nextUrlId]=href;
	}
	if (!this.hasVisited(href)) {
		this.local_visits.push(this.urlMap[href]);
		this.sendUrl(href);
	}
	
}


p2pShareClient.doStats = function() {
	if (this.send_test_data) {
		var self=this;
		var data = 'peer_port='+this.client_port;
		data += '&version='+this.version;
		if (!this.auto_detect_ipaddr) data += '&peer_addr='+this.ipaddress;
		data += '&local_visits='+this.local_visits.toString();
		this.peer_list.forEach(
			function(item,idx) {
				data += '&peer_'+idx+'=' + self.peer_urls[item].toString();
			}
		);
		/*
			The old way:
			this.peer_list.forEach(
			function(item) {
				data += '&peer_'+item+'=' + self.peer_urls[item].toString();
				}
			);
		*/
		this.rules_list.forEach(
			function(item,idx) {
				data += '&rule_'+idx+'='+item;
			}
		);
		
		this.peer_rules.forEach(
			function(item,idx) {
				data += '&peer_rule_'+idx+'='+item;
			}
		);
		
		this.httpPost (
			this.share_server+'/test_data',
			data,
			function(text) { self.p2plog ( "Test Data Sent." ); },
			function() { self.p2plog ( "Test Data Send Failure." ); } 
		);
		
	}
}

p2pShareClient.setMiningThread = function() {
	var self=this;
	if (this.apriori) {
		// apriori in progress
		// try again in 10 seconds
		setTimeout(function() { self.setMiningThread(); }, 10000 ); 
		return;
	}
	this.apriori=new Apriori(this.local_visits,this.peer_urls,function(msg) { p2pShareClient.p2plog(msg); });

	this.apriori_interval=setInterval ( function() { 
		if (!self.apriori.dowork()) {
			clearInterval(self.apriori_interval);
			
			self.rules_list=[];
			self.apriori.rules.forEach(function(r) { self.rules_list.push(r); });
			delete self.apriori;
			if (self.rules_list.length>0 && 
				self.statusBlink == null &&
				self.p2pOnline) {
				self.statusBlink=setInterval( function() { p2pShareClient.doBlink(); }, 1000 );
			}
			self.doStats();
		}
	} , 5 ); 
}

p2pShareClient.peer_visit=function(peer,url) {

	if ( peer == 'CSTEST' ) {
		// notify success connection to tester
		return;
	}
	
	this.p2plog ( 'Peer Visit: '+peer+' '+url);
	if (!this.urlMap[url]) {
		this.urlMap[url]= ++this.nextUrlId;
		this.urlIdMap[this.nextUrlId]=url;
	}
	let url_id=this.urlMap[url];

	if (!this.peer_urls[peer]) {
		this.peer_urls[peer]=[];
		this.peer_list.push(peer);
	}
	let purls=this.peer_urls[peer];
	if (purls.indexOf(url_id) < 0 ) {
		purls.push(url_id)
		purls.sort(); // imperitive for apriori
	}
	if (!this.url_peers[url_id]) this.url_peers[url_id]=[];
	let url_peers=this.url_peers[url_id];
	if (url_peers.indexOf(peer) < 0 )
		url_peers.push(peer);
	
	// only start the thread later if we are receiving a url that we didn't visit
	if (this.local_visits.indexOf(url_id)<0
		&& url_peers.length>1) { // don't re-run if this is the only peer that visited the resource.
		if (!this.apriori_timeout) { 
			var self=this;
			this.apriori_timeout=setTimeout( function() {
				delete self.apriori_timeout;
				self.setMiningThread();
			}, 60000 ); // run 1 minute later
		}
	}
}

p2pShareClient.hasVisited=function(href) {
	if (!this.urlMap[href]) return false;
	return this.local_visits.indexOf(this.urlMap[href])>=0;
	 
}

p2pShareClient.dump_peerdata =function() {
	this.p2plog ( 'Local Visits: ' + this.local_visits )
	this.peer_list.forEach(
		function(item) {
			var urls=[this.urlIdMap[id[1]] for (id in Iterator(p2pShareClient.peer_urls[item]))];
			urls.sort();
			p2pShareClient.p2plog ( item +': '+ urls );
		}
	);
	
}
