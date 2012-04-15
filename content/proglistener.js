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

const STATE_STOP = Components.interfaces.nsIWebProgressListener.STATE_STOP;
const STATE_IS_DOCUMENT = Components.interfaces.nsIWebProgressListener.STATE_IS_DOCUMENT;

var p2pLoadListener =
{

  /*
       Not all URLs are ok
    */
  loadedUrls: {},
  locationUrls: {},
  
  QueryInterface: function(aIID)
  {
   if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
       aIID.equals(Components.interfaces.nsISupports))
     return this;
   throw Components.results.NS_NOINTERFACE;
  },

  
  
  onStateChange: function(aProgress, aRequest, aFlag, aStatus) {
	// p2pShareClient.p2plog ( "State Change" );
	try {
		if (aFlag & STATE_STOP) {
			if (aRequest && aRequest instanceof Components.interfaces.nsIHttpChannel) {
							
				
				var httpc = aRequest.QueryInterface(Components.interfaces.nsIHttpChannel);
				
				if (!httpc.URI) {
					p2pShareClient.p2plog ( 'No URI for channel' );
					return 0;
				}
				
				try {
					if (httpc.contentType != 'text/html' ) {
						return 0;
					}
				} catch ( e ) {
					return 0; // sometimes contentType isn't available
				}
				
				// only share GET requests
				if (httpc.requestMethod != 'GET') return 0;
				// only share successfule requests
				if (!httpc.requestSucceeded) return 0;
				if (!httpc.responseStatus == 200) return 0;
				
				// test against request headers for authorization
				var v={ hasAuth: false,
						visitHeader: function(n,v) {
						//p2pShareClient.p2plog ( "RequestHeader: "+n+": "+v );
						if (/^Authorization$/i.test(n)) this.hasAuth=true;
					}};
				httpc.visitRequestHeaders (v);
				if (v.hasAuth) {
					p2pShareClient.p2plog ( "Not Sharing Authorized URL" );
					return 0;
				}
								
								
				if (this.locationUrls[httpc.URI.spec]) { 
					p2pShareClient.onPageLoad ( httpc.URI.spec );
					delete this.locationUrls[httpc.URI.spec];
				} else {
					this.loadedUrls[httpc.URI.spec]=true;
				}
				
				
			} /* else {
				if (aRequest) 
					p2pShareClient.p2plog ( "Document is not an nsIHttpChannel"  );
			} */
		} 
		
	} catch ( e ) {
		p2pShareClient.p2plog ( "Error Testing State Change: "+e.message );
	}
	return 0;
  
  },

  onProgressChange: function() {return 0;},
  onLocationChange: function(webProgress, request, location ) {
    try {
		
		// Re-Execute the local visit code to ensure new peers hear about this location
		// that we are still browsing
		 var url=p2pShareClient.tweakURLForSharing(location.spec);
		if (p2pShareClient.hasVisited(url)) {
			if (this.loadedUrls[location.spec])
				delete this.loadedUrls[location.spec];
		    setTimeout(function() {
				p2pShareClient.p2plog ( "Re-send to peers: "+url );
				p2pShareClient.sendToPeers(url);}, 3000 );
			return 0;
		}
		
		if (!this.loadedUrls[location.spec])
			this.locationUrls[location.spec] = true;
		else {
			delete this.loadedUrls[location.spec];
			p2pShareClient.onPageLoad(location.spec);			
		}
		
		
	} catch ( e ) {
		p2pShareClient.p2plog ( "Exception: "+ e.message );
	}
	return 0;
  },  
  onStatusChange: function() {return 0;},
  onSecurityChange: function() {return 0;},
  onLinkIconAvailable: function() {return 0;}
  
}
