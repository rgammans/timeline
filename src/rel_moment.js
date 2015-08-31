
class MemoryMoment {
      constructor(initVal) {

            this.base = initVal
            this._ops = []
        }

    append_op(op) {
        this._ops.push(op);
    }

    set(value_desc) {

        this.ops = [];
        this.base = moment(value_desc);
    }

    /**
    * Move the current instance backwards in time the specified amount frm it's current
    *   value.
    */
    move_back(amt,units) {
        this.append_op({'op':'subtract','amt':amt,'units':units});
    }

    /**
    * Move the current instance forward in time the specified amount frm it's current
    *   value.
    */
    move_forward(amt,units) {
        this.append_op({'op':'add','amt':amt,'units':units});
    }
    
    /**
    * Create a new instance using this as a base, with a value the specifed amount of
    * before this instances' value. And bound to this instance as a base
    */
    subtract(amt,units) {
        //Buid a new values based on tjis
        var rv = new MemoryMoment(this);
        rv.append_op({'op':'subtract','amt':amt,'units':units});
        return rv;
    }
 
    /**
    * Create a new instance using this as a base, with a value the specifed amount of
    * after this instances' value. And bound to this instance as a base
    */
    add(amt,units) {
        //Buid a new values based on tjis
        var rv = new MemoryMoment(this);
        rv.append_op({'op':'add','amt':amt,'units':units});
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

    _checkBase(val,opts) {
        //Helper function for find base.
        for (var i=0 ; i< opts.length; ++i ) {
            var possible  = opts[i];
            if (possible == val) {
                return { value:possible, index:i};
            }
            return null;
        }
    }

    /**
    * Identify if the base object this is closest bound to from the 
    * list provided.
    * returns and object or null if not found.
    *
    * The object has the following format
    *    ops: A list of operation adjust the base to this value.
    *    value: the found base value,
    *    index: this index of the base value in the provided options
    */
    findBase(opts) {
        var ops = [];
        ops = ops.concat(this._ops);
        var cur = this.base;
        while (cur) {
            var tst = this._checkBase(cur,opts);
            if (tst)  {
                return  { ops:ops, index:tst.index,value:tst.value };
            }
            ops = ops.concat(cur._ops);
            cur = cur.base;
        }
        return null; //Not found
    }


}

MemoryMoment.ops = ['add','subtract'];
MemoryMoment.verbose_ops = ['after','before'];
MemoryMoment.units = ['years','quarters','months','weeks','days',
                      'hours','minutes','seconds','milliseconds'];
