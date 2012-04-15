function Apriori(
	local_visits,
	peer_data, logger) {
	
	this.local_visits=[];
	this.peer_data={};
	this.url_peers={};
	this.logger=logger;
	
	var self=this;
	local_visits.forEach(function(i) {self.local_visits.push(i);});
	this.peer_list=[];
	for (peer in peer_data) {
		this.peer_list.push(peer);
		this.peer_data[peer]= [];
		peer_data[peer].forEach(function(i) { 
			self.peer_data[peer].push(i); 
			if (!self.url_peers[i]) self.url_peers[i]=[];
			if (self.url_peers[i].indexOf(peer)<0) self.url_peers[i].push(peer);
		});
	}
	
	this.L=new LargeItemSets(logger); // large item sets
	this.F=[new CandidateSet()]; // frontier sets (initialized to an empty set)
	this.F[0].ref_count=this.num_peers; // every tuple has the empty set
	this.passcount=0;
	this.min_support=2/this.peer_list.length;
	this.confidence=.1;
	this.state=Apriori.prototype.STATE_GEN;
}

Apriori.prototype={
	STATE_GEN: 1,
	STATE_CONSOLIDATE: 2,
	STATE_RULES: 3,
	
	log: function(msg) {
		this.logger(msg);
	},
	
	/*
		generate extensions of itemSet
		let item Ij be such that VIt E X, Ij >= It;
		forall items Ik in the tuple t such that Ik > Ij do begin
			Output(xlk );
			if (Xlk ) is expected to be large then
				Extend(X1k, t);
		end
	*/
	extend: function( itemSet, urls, min_support, ik ) {
		var self=this;		
		var ij = itemSet.set.length>0 || ik.length>0 ?
			urls.slice (
				ik.length>0 ? 
				urls.indexOf( ik[ik.length-1] )+1:
				urls.indexOf( itemSet.set[itemSet.set.length-1] )+1
			) :
			urls;
		//ij.forEach ( function (i) {
		for (var i=0;i<ij.length;++i ) {
			var cs=new CandidateSet();
			cs.set=itemSet.set.concat(ik,ij[i]);
			cs.ref_count=1;
			
			// further extend?
			// expected support = F(u) * (x-c)/dbSize
			
			// NOTE (x-c) 
			// not sure if this.url_peers[ij[i]].length;/this.peer_list.length is correct
			var s = (itemSet.ref_count-itemSet.cur_count)/this.peer_list.length * this.url_peers[ij[i]].length / this.peer_list.length;
			ik.forEach(function(k){
				s *= self.url_peers[k].length / self.peer_list.length;
			});
			cs.expected_large = s >= min_support;
			yield cs;
			
			if ( cs.expected_large ) 
				for ( nc in this.extend( itemSet, urls, min_support, ik.concat(ij[i]) ) ) 
					yield nc;
		
		}
	},
	
	/*
		Does the next little bit of work for the current state
	*/
	dowork: function() {
		switch(this.state) {
			case Apriori.prototype.STATE_GEN: 
				return this.doGen();
			case Apriori.prototype.STATE_CONSOLIDATE:
				return this.doConsolidate();
			case Apriori.prototype.STATE_RULES:
				return this.doRules();
		}
		throw new Error("Bad State in Apriori");
	},
	
	/*
		For each peer, go through the list of front sets and see if this peer visited the front set urls
		if that is true, extend the front set with this peers urls and add those to candidate sets
	*/
	doGen: function() {
		if ( this.peer_idx == null ) {
			// this would be start case
			this.peer_idx=0;
			this.passcount++;			
			this.C=[];
			this.log( "Apriori Pass: "+this.passcount);
		}
		
		if ( this.peer_idx > this.peer_list.length-1 ) {
			// ok, this means we finished the GEN state
			delete this.peer_idx;
			delete this.fset_idx;
			this.state=Apriori.prototype.STATE_CONSOLIDATE;
			//this.log ( "New Candidate Sets: " + this.C );
			return true;
		}
		
		if ( !this.fset_idx ) {
			this.fset_idx=0;
		}
		
		if ( this.fset_idx > this.F.length-1 ) {
			// we're done iterating through the Front sets, 
			this.peer_idx++;
			delete this.fset_idx;
			return true;
		}
		
		if ( !this.current_generator) {
			if (this.F[this.fset_idx].contained_in(this.peer_data[this.peer_list[this.peer_idx]])) {
				// make a generator for this front set/urls 
				this.F[this.fset_idx].cur_count++;
				this.current_generator = this.extend(
					this.F[this.fset_idx], 
					this.peer_data[this.peer_list[this.peer_idx]],
					this.min_support,
					[]
				);
			} else {
				// go on to the next
				this.fset_idx++;
			}
			
		} else {
			// there is a generator.. generate the next CS
			try {
				let newcs = this.current_generator.next();
				if (!this.C.some(function(lcs) {
					if (lcs.equals_set(newcs.set)) {
						lcs.ref_count++;
						// NOTE re-evaluate the next line
						// if (!cs.expected_large) lcs.expected_large=false;
						return true;
					} else {
						return false;
					} 
				})) {							
					this.C.push(newcs);
					//tmpcs=newcs;
				}
			} catch ( e if e instanceof StopIteration) {
				this.current_generator.close();
				delete this.current_generator;
				this.fset_idx++;
			}
		}
		return true;
		
	},
	
	
	doConsolidate: function() {
		this.log ( "Apriori Consolidate" );
		// consolidate
		this.F=[];
		var self=this;
		this.C.forEach(
			function(cs) {
				if (cs.ref_count / self.peer_list.length >= self.min_support ) {
					self.L.add(cs);
					if (cs.expected_large == false ) {
						cs.cur_count=0;
						self.F.push(cs);
					}
				}
				
			}
		);
		this.log ( 'New Front Sets: ' + this.F );
		//this.callback.log ( 'Large Sets: ' + L );
		this.state = this.F.length>0 ? Apriori.prototype.STATE_GEN : Apriori.prototype.STATE_RULES;
		return true;
	},
	
	doRules: function() {
		//this.log ( "Rules Gen" );
		if ( !this.rules ) this.rules=[];
		
		if (!this.current_generator) {
			this.log ( "Large Sets: "+this.L );
			this.current_generator = this.L.yieldRules(this.confidence);
		}
		
		let self=this;
		
		try {
			let r = this.current_generator.next();
			if ( r.antecedent.some (function(i){
					return self.local_visits.indexOf(i)>=0;})
				 && this.local_visits.indexOf(r.consequent)<0) {			
				this.rules.push(r);
			} else {
				this.log ( "Skipped Rule: " + r );
			}
			return true;
		} catch ( e if e instanceof StopIteration ) {
			return false;
		}

	}
}






/*********************************************************
 Support classes for Apriori Algorithm
 **********************************************************/
 
function CandidateSet() {
	this.ref_count=0;
	this.cur_count=0;
	this.set=[];
}
CandidateSet.prototype.toString = function() {
	return '(R:'+this.ref_count+'-'+this.set.toString()+')';
}

CandidateSet.prototype.append = function( url ) {
	this.set.push ( url );
	this.set.sort();
}
CandidateSet.prototype.contains = function ( url ) {
	return this.set.indexOf ( url ) >= 0;
}
CandidateSet.prototype.contains_all = function ( urls ) {
	//var tmp=new Array(urls);
	//tmp.sort();	
	var set=this.set;
	return urls.every ( 
		function( url ) {
			return set.indexOf(url) >= 0;
		} 
	);
}
CandidateSet.prototype.contained_in = function( urls ) {
	return this.set.every (
		function(url) {
			var ret = urls.indexOf(url) >= 0;			
			return ret;
		}
	); 	
}
CandidateSet.prototype.equals_set = function(set) {
	// set.sort(); should already be done
	return this.set.toString() == set.toString();
}

function AssociationRule(childCs,parentCs) {
	this.antecedent = childCs.set;
	
	for ( i in Iterator(parentCs.set) ) {
		if (childCs.set.indexOf ( i[1] ) < 0 ) {
			this.consequent = i[1];
			break;
		}
	}
	
	this.support = childCs.ref_count;
	this.confidence = parentCs.ref_count / childCs.ref_count;
}

AssociationRule.prototype.toString=function() {
	return this.antecedent.toString() + ' => '+this.consequent + ' | '+this.confidence + ' ('+this.support+')';
}

function LargeItemSets(logger) {	
	this.sets={};
	this.max_length=0;
	this.logger=logger;
}
LargeItemSets.prototype.add=function(cs) {	
	if (this.contains(cs)) return;	
	if (!this.sets[cs.set.length]) this.sets[cs.set.length]=[];
	this.sets[cs.set.length].push(cs);
	if ( this.max_length < cs.set.length ) this.max_length = cs.set.length;
}

LargeItemSets.prototype.contains = function(cs) {
	if (!this.sets[cs.set.length]) return false;
	return this.sets[cs.set.length].some(
		function(s) {
			return s.equals_set(cs.set);
		}
	);
}

// NOTE not very efficient :(
LargeItemSets.prototype.yieldRules = function(confidence) {
	let self=this;
	for ( var i=this.max_length; i> 1; --i ) {
		for (parent in Iterator(this.sets[i])) {
			// find children of cs
			for (child in Iterator(this.sets[i-1])) {
				if (child[1].contained_in(parent[1].set)) {
					if ( parent[1].ref_count / child[1].ref_count >= confidence ) {
						yield new AssociationRule ( child[1], parent[1] );
					} else {
						self.logger( "Skipping Confidence: "+ parent[1].ref_count / child[1].ref_count + " for: " + parent[1] + ", "+ child[1] );
					}
				}
			}
		}
	}
}

LargeItemSets.prototype.toString=function() {
	var s='Large Sets';
	for (var i=this.max_length;i>0;--i) {
		s+='\n\tSets of size: '+i;
		for (cs in Iterator(this.sets[i])) {
			s+= '\n\t\t'+cs[1].toString();
		}
	}
	return s;
}
