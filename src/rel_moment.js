//Note this is in ES6 Syntax - probaly need to do ES6 export stuff too

class MemoryMoment {
      constructor(initVal) {

            this.base = initVal
            this._ops = []
        }

    _append_op(op) {
        this._ops.push(op);
    }

    /**
    * Move the current instance backwards in time the specified amount frm it's current
    *   value.
    */
    move_back(amt,units) {
        this._append_op({'op':'subtract','amt':amt,'units':units});
    }

    /**
    * Move the current instance forward in time the specified amount frm it's current
    *   value.
    */
    move_forward(amt,units) {
        this._append_op({'op':'add','amt':amt,'units':units});
    }
    
    /**
    * Create a new instance using this as a base, with a value the specifed amount of
    * before this instances' value. And bound to this instance as a base
    */
    subtract(amt,units) {
        //Buid a new values based on tjis
        var rv = new MemoryMoment(this);
        rv._append_op({'op':'subtract','amt':amt,'units':units});
        return rv;
    }
 
    /**
    * Create a new instance using this as a base, with a value the specifed amount of
    * after this instances' value. And bound to this instance as a base
    */
    add(amt,units) {
        //Buid a new values based on tjis
        var rv = new MemoryMoment(this);
        rv._append_op({'op':'add','amt':amt,'units':units});
        return rv;
    }

    toMoment() {
        var rv = this.base;
        if (rv instanceof MemoryMoment) {
            rv = rv.toMoment();
        } else {
            //Ensure we hae a unique instance
            rv = moment(rv);
        }
        for (var op of this._ops) {

            if (op.op == "add") {
                rv.add(op.amt,op.units);
            }else {
             if (op.op == "subtract") {
                rv.subtract(op.amt,op.units);
            }}
        }

        return rv
    }
     toDate() {
        return this.toMoment().toDate();
    }


}
