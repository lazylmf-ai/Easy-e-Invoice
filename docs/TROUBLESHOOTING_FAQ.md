# Troubleshooting FAQ

## Quick Solutions to Common Issues

This FAQ provides quick solutions to the most common issues encountered by Easy e-Invoice users.

---

## 🔐 Login & Authentication Issues

### Q: I'm not receiving the magic link email

**A: Try these solutions in order:**

1. **Check your spam/junk folder** - Magic links sometimes get filtered
2. **Wait 2-3 minutes** - Email delivery can be delayed
3. **Add `noreply@yourdomain.com` to your contacts** - This prevents future filtering
4. **Request a new magic link** - The previous one may have expired (15-minute limit)
5. **Try a different email address** - Your email provider might be blocking our emails

**Still not working?** Contact support with your email address.

### Q: The magic link says it's expired

**A: Magic links expire after 15 minutes for security.**

**Solution:**
1. Go back to the login page
2. Enter your email address again
3. Request a new magic link
4. Use it within 15 minutes

### Q: I get "Invalid token" error when clicking magic link

**A: This usually happens when:**
- The link was already used
- The link is from an old email
- There's a browser/cache issue

**Solutions:**
1. **Request a fresh magic link** - Don't use old emails
2. **Open link in incognito/private mode** - This bypasses cache issues
3. **Clear your browser cache** - Old tokens might be cached
4. **Try a different browser** - Sometimes browser extensions interfere

### Q: I forgot which email I used to register

**A: Unfortunately, we can't look up accounts by name for privacy reasons.**

**Try these:**
1. **Check common email addresses** you use for business
2. **Look for old Easy e-Invoice emails** in your inbox
3. **Contact support** - We can help verify your account with additional information

---

## 🏢 Organization Setup Issues

### Q: My TIN number is not being accepted

**A: Malaysian TIN formats are very specific:**

**Company TIN (Sdn Bhd, Bhd, etc.):**
- Format: `C` + 10 digits
- Example: `C1234567890`
- Must be exactly 11 characters

**Individual TIN:**
- Format: 12 digits only
- Example: `123456789012`
- No letters, no spaces

**Government TIN:**
- Format: `G` + 10 digits
- Example: `G1234567890`

**Non-profit TIN:**
- Format: `N` + 10 digits
- Example: `N1234567890`

**Solutions:**
1. **Double-check the format** - No spaces, correct prefix
2. **Verify with SSM** - Check your company registration documents
3. **Contact LHDN** - They can confirm your correct TIN
4. **Try without spaces/dashes** - Use only the required format

### Q: I can't find my industry code (MSIC 2008)

**A: Industry codes are 5-digit MSIC 2008 codes.**

**Common codes:**
- `62010` - Computer Programming
- `69201` - Accounting Services
- `46900` - General Trading
- `85421` - Business and Management Consultancy
- `96012` - Hairdressing and Beauty Services

**To find your code:**
1. **Visit [dosm.gov.my](https://dosm.gov.my)** - Official MSIC 2008 database
2. **Check your SSM registration** - It might be listed there
3. **Use the search function** - Search by activity description
4. **Contact support** - We can help identify the correct code

### Q: SST settings are confusing - what should I choose?

**A: SST (Sales & Service Tax) settings depend on your registration:**

**If you're SST registered:**
- ✅ Check "SST Registered"
- SST Rate: `6%` (standard rate)
- Enter your SST number
- SST will be automatically calculated on invoices

**If you're NOT SST registered:**
- ❌ Uncheck "SST Registered"
- No SST will be added to invoices
- This is fine for small businesses under the SST threshold

**Not sure?** Check with your accountant or LHDN.

---

## 📄 Invoice Creation Issues

### Q: Invoice validation is failing with low score

**A: Validation scores below 70% indicate compliance issues.**

**Common issues and fixes:**

**TIN Format Issues (MY-001):**
- Fix: Use correct Malaysian TIN format (see above)

**Missing Required Fields (MY-002):**
- Fix: Fill in all required fields marked with *

**Incorrect SST Calculation (MY-006):**
- Fix: Verify SST rate (usually 6%) and registration status

**Invalid Industry Code (MY-004):**
- Fix: Use valid MSIC 2008 code (5 digits)

**Address Format Issues (MY-008):**
- Fix: Include full Malaysian address with postcode and state

### Q: SST calculation seems wrong

**A: Common SST calculation issues:**

**Problem:** SST showing as 0% when it should be 6%
**Solution:** 
1. Check your SST registration status in Organization Settings
2. Verify the line item has SST rate set to 6%
3. Ensure the item is not SST-exempt

**Problem:** SST calculation is incorrect amount
**Solution:**
1. SST = (Line Total - Discount) × SST Rate
2. Example: (RM 1000 - RM 50) × 6% = RM 57
3. Use our SST calculator in the help section

**Problem:** Some items should be SST-exempt
**Solution:** 
Set SST rate to 0% for exempt items like:
- Basic food items
- Medical services
- Education services
- Exported goods

### Q: Buyer's TIN validation keeps failing

**A: Buyer TIN validation is optional but helpful for B2B invoices.**

**Solutions:**
1. **For business buyers:** Use correct TIN format (C1234567890)
2. **For individual buyers:** Use 12-digit IC number or leave blank
3. **For government buyers:** Use G-prefix format (G1234567890)
4. **If unsure:** Leave TIN field blank - it's not mandatory

### Q: I can't edit an invoice I created

**A: This depends on the invoice status:**

**Draft invoices:** Can be edited freely
**Finalized invoices:** Cannot be edited (by design for audit trail)
**Submitted invoices:** Cannot be edited (already sent to LHDN)

**Solutions:**
1. **If draft:** Check if you have edit permissions
2. **If finalized:** Create a new invoice or credit note for corrections
3. **If submitted:** Contact support for serious errors only

---

## 📤 Import/Export Issues

### Q: CSV import is failing with errors

**A: CSV import issues are usually data format problems.**

**Common fixes:**

**Use the correct template:**
1. Download our CSV template from the import page
2. Don't change column headers
3. Follow the exact format shown

**Date format issues:**
- Use: `YYYY-MM-DD` (e.g., `2024-01-15`)
- Don't use: `DD/MM/YYYY` or `MM/DD/YYYY`

**Currency format issues:**
- Use: `1000.50` (decimal point, no commas)
- Don't use: `1,000.50` or `RM 1,000.50`

**TIN format issues:**
- Follow Malaysian TIN rules (see above)
- Leave blank if not applicable

**Required fields:**
- Invoice Number, Issue Date, Currency, Grand Total are required
- Buyer Name is required
- At least one line item is required

### Q: CSV file is too large and timing out

**A: Large files can cause timeouts.**

**Solutions:**
1. **Split your file** - Try importing 500-1000 records at a time
2. **Check file size** - Keep under 10MB
3. **Remove empty rows** - Delete unused rows in your spreadsheet
4. **Simplify data** - Remove unnecessary columns from template

### Q: Export is taking too long or failing

**A: Large exports can be slow.**

**Solutions:**
1. **Reduce date range** - Export smaller time periods
2. **Filter data** - Use status or buyer filters
3. **Choose format wisely** - CSV is faster than PDF for large datasets
4. **Try off-peak hours** - Less server load in the evening

---

## 💾 Data & Performance Issues

### Q: The system is running slowly

**A: Performance issues can have several causes:**

**Browser issues:**
1. **Clear browser cache** - Old data can slow things down
2. **Close other tabs** - Free up memory
3. **Update your browser** - Use latest version
4. **Try incognito mode** - Bypasses extensions and cache

**Internet connection:**
1. **Check your speed** - Use speedtest.net
2. **Try different network** - Mobile hotspot vs WiFi
3. **Close bandwidth-heavy apps** - Video streaming, downloads

**System-wide issues:**
1. **Check status page** - Visit status.yourdomain.com
2. **Try again later** - May be temporary server load
3. **Contact support** - If problems persist

### Q: My data seems to be missing

**A: Data doesn't disappear, but here's what to check:**

**Check filters:**
1. **Date filters** - Expand date range to see older data
2. **Status filters** - Include all statuses
3. **Search filters** - Clear search terms

**Check user permissions:**
1. **Organization access** - Ensure you're viewing the right organization
2. **User role** - Some data may be restricted by role

**Check recently:**
1. **Recent changes** - Did someone else modify the data?
2. **Bulk operations** - Were there any recent imports/exports?

**If data is truly missing:** Contact support immediately with details.

### Q: I accidentally deleted important data

**A: We have backups, but act quickly:**

**Immediate steps:**
1. **Don't create new data** - This might overwrite backups
2. **Note exactly what was deleted** - Invoice numbers, dates, etc.
3. **Contact support immediately** - We can restore from backups
4. **Provide details** - What, when, and how it was deleted

**Prevention:**
- Use "Archive" instead of "Delete" when possible
- Export important data regularly as backup
- Limit delete permissions to key staff only

---

## 🔍 Malaysian Compliance Issues

### Q: What's the difference between B2B and B2C invoices?

**A: Different rules apply to business vs. consumer invoices:**

**B2B (Business-to-Business):**
- Buyer must have TIN
- Full compliance validation required
- Can be consolidated monthly (some restrictions)
- Higher validation requirements

**B2C (Business-to-Consumer):**
- Buyer TIN optional (individuals)
- Simplified validation
- Consolidation restricted for some industries
- Consumer protection rules apply

**The system automatically detects this based on buyer TIN.**

### Q: Which industries cannot consolidate B2C invoices?

**A: These industries must issue individual B2C invoices:**

- **Electric power** (35101, 35102, 35103)
- **Water services** (36000, 37000)
- **Telecommunications** (61XXX codes)
- **Parking services** (52211)
- **Toll road services** (52212)
- **Public administration** (84XXX codes)

**If your business is in these industries, you cannot use monthly B2C consolidation.**

### Q: When do I need to submit to MyInvois?

**A: MyInvois submission requirements depend on your business size:**

**Mandatory for:**
- Companies with annual revenue > RM 25 million (from Jan 2025)
- Government suppliers (all sizes)
- Large corporations (from Aug 2024)

**Optional for:**
- Smaller businesses (below RM 25 million)
- Sole proprietors and partnerships
- Non-profit organizations

**Timeline:**
- Aug 2024: Large companies (>RM 100M)
- Jan 2025: Medium companies (>RM 25M)
- Jul 2025: All businesses (proposed)

### Q: MyInvois submission is failing

**A: MyInvois integration issues:**

**Common causes:**
1. **Invalid credentials** - Check MyInvois client ID/secret
2. **Network issues** - LHDN servers may be down
3. **Data validation** - Invoice doesn't meet LHDN standards
4. **Rate limiting** - Too many submissions too quickly

**Solutions:**
1. **Validate invoice first** - Ensure 90%+ compliance score
2. **Check LHDN status** - Visit MyInvois portal directly
3. **Retry later** - System may be temporarily overloaded
4. **Contact support** - We can check submission logs

---

## 📱 Browser & Technical Issues

### Q: The website isn't displaying correctly

**A: Display issues are usually browser-related:**

**Quick fixes:**
1. **Refresh the page** - Press F5 or Ctrl+R
2. **Clear browser cache** - Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
3. **Try incognito/private mode** - This bypasses cache and extensions
4. **Update your browser** - Use the latest version

**Supported browsers:**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Not supported:**
- ❌ Internet Explorer (any version)
- ❌ Very old browser versions

### Q: File uploads aren't working

**A: File upload issues:**

**Check file requirements:**
- **Size limit:** 50MB maximum
- **Formats:** CSV, PDF, JPG, PNG only
- **Encoding:** UTF-8 for CSV files

**Browser issues:**
1. **Disable ad blockers** - They might block uploads
2. **Check browser permissions** - Allow file access
3. **Try different browser** - Test in Chrome/Firefox
4. **Stable internet** - Uploads can fail on slow/unstable connections

**File issues:**
1. **Check file isn't corrupted** - Try opening it locally
2. **Rename file** - Remove special characters from filename
3. **Convert format** - Excel to CSV, PNG to JPG if needed

### Q: I'm getting SSL/Security certificate errors

**A: Security certificate issues:**

**Quick solutions:**
1. **Check the URL** - Make sure it's `https://yourdomain.com` (not `http://`)
2. **Clear browser data** - Including certificates and cache
3. **Check date/time** - Incorrect system time can cause SSL errors
4. **Try different network** - Corporate firewalls sometimes interfere

**If error persists:**
1. **Try incognito mode**
2. **Contact your IT department** - They may need to whitelist our domain
3. **Contact our support** - We can check our certificate status

---

## 📞 Getting Additional Help

### When to Contact Support

**Contact us immediately for:**
- 🔐 Security concerns or suspected breaches
- 💸 Payment or billing issues
- 📊 Missing or corrupted data
- 🚨 System-wide problems affecting multiple users

**Contact us within 24 hours for:**
- 🔧 Feature requests or enhancements
- 📚 Training or education needs
- 🔗 Integration questions
- 📝 Account setup assistance

### How to Contact Support

**Email Support** (Business hours response)
- 📧 [support@yourdomain.com](mailto:support@yourdomain.com)
- Response time: 4-8 hours during business hours

**Live Chat** (Business hours only)
- 💬 Available in the application
- Response time: 5-15 minutes

**Phone Support** (Premium plan)
- 📞 +60 3-1234-5678
- Hours: 9 AM - 6 PM, Monday to Friday (GMT+8)

**Emergency Support** (Critical issues only)
- 🚨 [emergency@yourdomain.com](mailto:emergency@yourdomain.com)
- Response time: 2 hours, 24/7

### Information to Include When Contacting Support

**Always include:**
1. **Your email address** associated with the account
2. **Clear description** of the problem
3. **Steps you've already tried** to fix it
4. **Error messages** (screenshots helpful)
5. **Browser and operating system** you're using

**For invoice issues, include:**
- Invoice number
- Organization name
- Validation error messages
- Screenshots of the issue

**For import/export issues, include:**
- File size and format
- Number of records
- Sample of problematic data
- Error messages from the import process

### Community Resources

**Help Center**
- 📚 [help.yourdomain.com](https://help.yourdomain.com)
- Comprehensive guides and tutorials
- Updated regularly with new content

**Community Forum**
- 💬 [community.yourdomain.com](https://community.yourdomain.com)
- User discussions and tips
- Official announcements
- Feature requests and feedback

**Video Tutorials**
- 🎥 [youtube.com/c/easyeinvoice](https://youtube.com/c/easyeinvoice)
- Step-by-step walkthroughs
- New feature demonstrations
- Best practices and tips

**Status Page**
- 📊 [status.yourdomain.com](https://status.yourdomain.com)
- Real-time system status
- Planned maintenance notifications
- Incident reports and updates

---

## 💡 Pro Tips for Smooth Operation

### Best Practices to Avoid Issues

**Organization Setup:**
1. **Verify TIN carefully** before saving - it's hard to change later
2. **Keep company information updated** - Changes affect invoice compliance
3. **Use consistent naming** - Makes searching and filtering easier

**Invoice Management:**
1. **Use templates** for recurring invoices - Saves time and reduces errors
2. **Validate before finalizing** - Fix issues while you can still edit
3. **Regular backups** - Export your data monthly as CSV backup

**Data Management:**
1. **Consistent formatting** - Use the same date and currency formats
2. **Regular cleanup** - Archive old data you don't need frequently
3. **Monitor validation scores** - Address declining compliance early

### Performance Optimization Tips

**For better performance:**
1. **Close unused browser tabs** - Frees up memory
2. **Use latest browser version** - Better performance and security
3. **Stable internet connection** - Wired is better than WiFi for large operations
4. **Work during off-peak hours** - Evenings typically have better performance

**For large operations:**
1. **Batch processing** - Import/export in smaller chunks
2. **Use filters** - Narrow down data before operations
3. **Schedule heavy tasks** - Do large exports during low-usage times

---

*This FAQ is updated regularly based on user feedback and common support requests. If you have suggestions for additions, please contact [support@yourdomain.com](mailto:support@yourdomain.com).*

*Last updated: January 2024*