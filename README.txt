This client is built as a plugin for FireFox.
It works with browsers from version 2.0 through the current 2.x.

The plugin can be installed by opening the fireshare.xpi file with FireFox.
The plugin is also located at http://fireshare.net/fireshare.xpi
The plugin will auto update when there is a new version uploaded.

	
TODO:
	UI Improvements:
	* Combine Share & Peer data into one dialog with tabs.
	* Make URL Filters widget into an editable list box or similar instead of newline separated	
	* Give more peer information. e.g. if a peer is inactive.
	* Enhance interesting URLs to differentiate between visited/not yet
	  visited.  Leave visited URLs in list.  Only blink Icon when 
	  There are unvisited URLs and the window havn't been shown yet.
	  (Track new interesting URLs separately and unmark new when the
	  dialog is displayed.)
	* Enhance the interesting URLs to show a preview (like title,desc) of the URL 
	  so that the user can make a better decision whether or not they want to view 
	  that URL.  Possibly make this a preference that can be enabled or disabled.
	* Enhance connection tests to detect local ip address vs CS detected IP address
	  to warn about firewall/router configuration.  Possibly refer to portforward.com
	* Add a messages blink with warning icon or something to let client
	  know if there are network errors or messages from clients or
	  whatever.
	
	Data Mining Improvements:
	* Allow customization of Apriori Parameters	
	  (-speed at which algorithm executes.
	   -delay before mining starts after new url received
	   -support/confidence.)
	* Steamline Apriori for faster Execution
	* Mine All rules (unless limited by customizations), and show them
	  in order of strongest to weakest.
	* Save mined rules and consider those+rules that are coming from peers as well,
	  when looking for rules to pass to new clients.
		
	Peer Protocol Improvements:
	* Allow persistent visit & peer data
	* Configurable maximum number of active peers
	* Configurable target active peers per shared URL.  Re-Check either CS
	  or active peers for more peers if less than desired peer level.	
	* Tweak CS to return peers based on domain as a fallback if URL
	  specific peers are not found.
	* Possibly enhance CS to track and only return active peers.  Perhaps research
	  distributed peers instead and get rid of CS.
	* Possibly reply to peer_visit with some URLs that are frequent sets with that URL??
	* Check when NOT to request more peers from the CS.	
	* Send back state of peer when peer posts.  This can let the peer know
	  if they have their network set up properly or not.

BUGS:	
	* URL dialogs to expand with window resize
	* When testing connection on the Preferences Dialog, if you change the port, the server
	  has to be restarted before the test will work.  (It is listening on the old port still)
	* Icon on status bar seemed to cause tooltip to disappear.	
	* First run page doesn't always open on 1st run.  (Like when session is set to restore
	  from previous run.)
	* On Linux, the welcome page is not backgrounded white.
	* On some platforms, the connection tests are truncated on the bottom and hard to read.

NOTES:
	* Should time be a part of the decision as to whether to send a page
	  or not?  ie.g., if someone clicks on a page and then closes it quickly, should that
	  page not be considered as readily?
	  
Changes in 0.2.7
	* Relocate source directories so build process creates smaller xpi.
	* Peers share previously discovered association rules if appropriate.	
	  
Changes in 0.2.6
	* Fix for duplicate frequent item sets listed in Apriori.
	* Change Apriori confidence/support in preparation for 0.3 (customizable).
	* Change Apriori to run in chunked algorithm instead of thread.
	  (Fixes thread bugs)
	* Put the note about the welcome page showing every time to be
	  highlighted.
	* 1strun page is shown until a successful connection test is performed.
	  Also change pref name so older clients also see the new page on
	  upgrade.
	* Fix running local visit code after getting PEERs from CS can post a
	  URL twice to a peer.
	* Don't re-run apriori if only one peer has visited a resource.

Changes in 0.2.5
	* Wait longer before running Apriori so it doesn't run after every
	  single peer visit.
	* Don't run apriori in response to incoming peer visits if the url
	  has already been locally visited.
	* Change protocol to immediately respond to X-FireShare-PeerRequest
	  with active peers instead of waiting and posting back.
	* Enhance protocol to send back additional visited URLs in response
	  to an incomming url that client has visited.

Changes in 0.2.4.2
	* Bug fix in X-FireShare-PeerRequest Check

Changes in 0.2.4.1
	* Typo in log message
	* Bug in logic in peerPost response

Changes in 0.2.4
	* Don't run apriori on local visit peers from CS (no results because
	  it's a local visit)
	* Fix on preferences dialog for disappearing text during connection tests.
	* Posting to peer sends header that tells peer if client needs more active peers.
	  Clients send active peers for url back to requesting client when appropriate.
	* Client sends URLs that are still active to new peers.
	* Enhance URL normalizer to strip named anchors.
	* Enhancements to marking/unmarking peers as active/error state.
	* Enhance tracking of which urls are sent to peers based on peer error state.
	* New 1st Run page.
	* Put suggestion to test and set preferences on a 1st run/welcome page.
	* Test Data to format the peer addresses/urls correctly.

Changes in 0.2.3.3
	* Previous two versions lacked new js file.

Changes in 0.2.3.2
	* Logic fix in foundurls dialog.

Changes in 0.2.3.1
	* Bug fix in XML syntax on foundurls dialog.
	  
Changes in 0.2.3
	* Enhanced test messages on preferences dialog to help with diagnosing issues.
	* Different Association Rules with same consequent should be filtered
	  so consequent is only shown once. (Needs Testing)
	* Do send a URL to peers if we have already visited the URL.  Track which URLs
	  have already been sent to provide a better picture to our peers.

Changes in 0.2.2.2
	* Apriori Thread to catch internal exceptions

Changes in 0.2.2.1
	* Home page update to fireshare.net
	* Apriori Thread to sleep for minor increment 
	  
Changes in 0.2.2
	* Privacy Policy link on about dialog.
	* About dialog to open links in new tab instead of new window.
	* 1st run opens privacy policy in new tab.
	  
Changes in 0.2.1
	* Icon for Status Bar w/ blinking status when interesting URLs are found.
	* Rename chrome URLs to have fireshare root
	* Add Mozilla License to code files
	* Progress Listener filters out POST requests, requests with authorization headers,
	  redirects, 404 pages etc.
	* Create a higher resolution icon for the icon used in the add-ons menu
	  
Changes in 0.2.0.1
	* Lower the Apriori thread priority
	* Re-Activate peer code fixed.
	  
Changes in 0.2.0
	* filter cache-control: private, no-cache, no-store etc. (Unfinished)
	* Timeout work for Connecting to Peers
	* Mark peers as possibly dead.  Algorithm skips dead peers.  Peers are unmarked as dead
	  if more information is received from them.
	* Allow Apriori to run a long time without blocking the GUI

Changes in 0.1.9
	* FireShare Graphic/Name
	* Fix Tooltip on Status Bar Panel
	* About and Preferences in Popup Menu

Changes in 0.1.8
	* Don't do local visit code if not online
	* setTimeout for sending to peers on local visits so pages can load immediately
	* Dynamically add the version to the about dialog so locale doesn't have to change it at each version
	* Correct Title on About Dialog
	  
Changes in 0.1.7
	* Regular Expression Tests for invalid incoming requests is wrong
	  where "url=" because sometimes = can be in the headers
	* Client send to all peers on local visit

Changes in 0.1.6
	* add peers to peer map on response from CS.
	* Send Extension version with test data for reporting
	* filter path elements from URLs (;jsessionid)
	
Changes in 0.1.5
	* Fix for peer to attempt communication correctly.
	* Experimentation Reporting, allow user to opt out or in of reporting for thesis purposes

Changes in 0.1.4
	* Enhanced Preferences Dialog to be able to enable/disable client.

Changes in 0.1.3
	* CS/Peer Test, to make sure the client is working
	
Changes in 0.1.2
	* Allow for customization of listen address and port (requires CS upgrade)
	* Store returned peers from the CS according to the algorithm in the paper.
	* Filter URLS according to scheme (HTTPS) and preferences.
	* Implement apriori on stored peer urls.
	* create interface for association rules to be presented to end user.
	* Allow server to be enabled or disabled.
