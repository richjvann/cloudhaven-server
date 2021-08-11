import mongoose from "mongoose"
var Schema = mongoose.Schema;
//var AuthUserSchema = mongoose.model('AuthUser').schema;

var phoneMatch = [ /^[+]?([\d]{0,3})?[\(\.\-\s]?([\d]{3})[\)\.\-\s]*([\d]{3})[\.\-\s]?([\d]{4})$/,
    "Please enter a valid phone number."];
var emailMatch = [/^[^@]+@[^\.]+\..+$/, 
    "Please fill a valid email address"];
var contactSchema = new Schema ({
    isActive: {type: Boolean, default: true},
    //User tbd
    preferredContactMethod: {type: String, enum : ['Phone', 'Mobile Phone', 'Email'] },
    phone: {type: String, match: phoneMatch }, 
    email: {type: String, match: emailMatch },
    fax: {type: String, match: phoneMatch },
    textPhone: {type: String, match: phoneMatch },
    attn: String,
    streetAddress: String,
    city: String,
    stateOrProvince: String,
    zipOrPostalCode: String,
    country: String,
    language: {type: String, required: true, default: "English", enum: ["English", "Spanish"] }
});
contactSchema.virtual('fullAddress').get(function () {
  var addressLines = [];
  if (this.attn) addressLines.push(this.attn);
  if (this.streetAddress) addressLines.push(this.streetAddress);
  if (this.city || this.stateOrProvince || this.zipOrPostalCode) addressLines.push(this.city+', '+(this.stateOrProvince?this.stateOrProvince:'')+(this.zipOrPostalCode?('  '+this.zipOrPostalCode):''))
  if (this.country) addressLines.push(this.country);
  return addressLines.join('\n');
});
contactSchema.set('toJSON', { virtuals: true });
export default mongoose.model( 'Contact', contactSchema );