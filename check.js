const fs = require('fs');
const testContent = fs.readFileSync('D:/Final_Project/frontend/src/pages/MySchedulePage/MySchedulePage.test.tsx', 'utf8');
const implContent = fs.readFileSync('D:/Final_Project/frontend/src/pages/MySchedulePage/MySchedulePage.tsx', 'utf8');

console.log('=== TEST FILE CHECKS ===');
console.log('Lịch tuần gọn region:', testContent.includes('Lịch tuần gọn'));
console.log('Lịch tuần region:', testContent.includes('Lịch tuần'));
console.log('rowheader Sáng:', testContent.includes('Sáng'));
console.log('3_BUTTON:', testContent.includes('3 buôi'));
console.log('Theo giờ_BUTTON:', testContent.includes('Theo giờ'));

console.log('');
console.log('=== IMPLEMENTATION FILE CHECKS ===');
console.log('initialScheduleMode:', implContent.includes('initialScheduleMode'));
console.log('canToggleScheduleMode:', implContent.includes('canToggleScheduleMode'));
console.log('mode useState:', implContent.includes('mode') && implContent.includes('useState'));
console.log('CompactScheduleGrid:', implContent.includes('CompactScheduleGrid'));
console.log('WeeklyScheduleGrid:', implContent.includes('WeeklyScheduleGrid'));

const idx1 = implContent.indexOf('CompactScheduleGrid');
const idx2 = implContent.indexOf('WeeklyScheduleGrid');
let hasOnSelect1 = false, hasOnSelect2 = false;
if (idx1 !== -1) {
  const snippet1 = implContent.substring(idx1, idx1 + 40);
  hasOnSelect1 = snippet1.includes('onSelect');
}
if (idx2 !== -1) {
  const snippet2 = implContent.substring(idx2, idx2 + 40);
  hasOnSelect2 = snippet2.includes('onSelect');
}
console.log('No onSelect on grids:', !hasOnSelect1 && !hasOnSelect2);

console.log('fetchMySchedule call:', implContent.includes('fetchMySchedule({')));
console.log('canView preserved:', implContent.includes('canView'));