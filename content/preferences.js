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

function ipAddrDisabler() {
	
	var cb=document.getElementById('auto_detect_cbox');
	//alert ( 'cb is checked: ' + cb.checked );
	document.getElementById('ipaddr_text').disabled=cb.checked;
}

var p2pPrefStrings;
function setStrings() {
	p2pPrefStrings = document.getElementById ( 'p2pPrefStrings' );
}

function appendTestBegin(msg) {
	// create new hbox
	var h = document.createElement ( 'hbox' );
	h.setAttribute ( 'id', 'temp_test' );
	var img = document.createElement ( 'image' );
	img.setAttribute ( "src", "chrome://fireshare/skin/x.png" );
	img.setAttribute ( "width", "25" );
	img.setAttribute ( "height", "25");
	h.appendChild ( img );
	
	var l=document.createElement ( 'description' );
	l.setAttribute ( 'maxwidth', '370' );
	//l.setAttribute ( 'value', msg );
	l.appendChild ( document.createTextNode(msg) );
	h.appendChild ( l );
	document.getElementById ( 'test_list' ).appendChild ( h );
}

function appendTestResult(ok,msg) {
	// create a new hbox
	let (tt=document.getElementById ( 'temp_test' )) {		
		if (tt)
			document.getElementById('test_list')
				.removeChild(tt);
	}
	
	 var h = document.createElement ( 'hbox' );
	var img = document.createElement ( 'image' );
	img.setAttribute ( "src", "chrome://fireshare/skin/"+(ok?"check.png":"x.png") );
	img.setAttribute ( "width", "25" );
	img.setAttribute ( "height", "25");
	h.appendChild ( img );
	
	var l = document.createElement ( 'description' );
	l.setAttribute('maxwidth','370');
	l.appendChild(document.createTextNode(msg));
	h.appendChild ( l );
	
	document.getElementById ( 'test_list' ).appendChild ( h );
			
} 

function conTest() {

	if (! document.getElementById ( 'enabled_cbox' ).checked ) {
		alert ( p2pPrefStrings.getString ( 'con_test.not_enabled' ) );
		return;
	}
	// test values of current panel elements, not saved preferences
	// in case the prefs aren't applied yet.
	var list=document.getElementById ( 'test_list' );
	
	while ( list.firstChild ) list.removeChild ( list.firstChild );
	
	appendTestResult ( true, 
		p2pPrefStrings.getString ( 'con_test.test_started' )
	);
	
	try {
	
		appendTestBegin ( p2pPrefStrings.getString('con_test.begin_connect_to_cs') );
	
		var auto=document.getElementById ( 'auto_detect_cbox' ).checked;
		var port=document.getElementById ( 'port_text' ).value;
		var data = "peer_port="+port;
		if (!auto) {
			data += "&amp;peer_addr="+document.getElementById ( 'ipaddr_text' ).value;
		}
		var cs = document.getElementById ( 'server_text' ).value;
		
		var xmlhttp = new XMLHttpRequest(); 
		xmlhttp.open("POST", cs+"/con_test", true);     
		xmlhttp.onreadystatechange=function(){ 
			if(xmlhttp.readyState==4){ 
				if (xmlhttp.status==200) {
					if ( /con_addr/.test ( xmlhttp.responseText ) ) {
						var ret= eval ( '('+xmlhttp.responseText + ')' );
						appendTestResult ( true, 
							p2pPrefStrings.getFormattedString ( "con_test.received_ip", [ret.con_addr] ) );
						if (ret.con_success ) {
							appendTestResult ( true, 
							 p2pPrefStrings.getString( 'con_test.client_connect' ) );
							 
							let prefs=Components.classes["@mozilla.org/preferences-service;1"]
						         .getService(Components.interfaces.nsIPrefService)
						         .getBranch("extensions.p2pshare.");
							prefs.setBoolPref ( 'firstrun' , false );
							
						} else {
							appendTestResult ( false, 
								p2pPrefStrings.getString('con_test.client_noconnect') );
							appendTestResult ( false, ret.con_failure );
						}
					} else {
						appendTestResult ( false, 
							p2pPrefStrings.getString('con_test.bad_server_response'));
					}
				} else {
					appendTestResult( false, 
						p2pPrefStrings.getString('con_test.no_connect_to_cs'));
				} 
				appendTestResult ( true,
					p2pPrefStrings.getString('con_test.test_complete')
				);
			} 
		}; 
		
		xmlhttp.setRequestHeader ( 'Content-type', 'application/x-www-form-urlencoded' );
		xmlhttp.setRequestHeader ( 'Content-length', data.length );
		xmlhttp.send(data); 
		
		// NOTE could possibly move these next two to the appropriate readyState in the xml request above
		appendTestResult ( true, 
			p2pPrefStrings.getString('con_test.data_sent_to_cs'));
			
		appendTestBegin ( p2pPrefStrings.getString('con_test_begin_cs_connect_back') );
	} catch ( e ) {
		alert ( e );
		appendTestResult(false,e.message);
	}
}
