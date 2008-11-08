function documentWriteInline_Step()
{
    return true;
}
function documentWriteInline()
{
    documentWriteInline_Step(); // set breakpoint on this line
    documentWriteInline_Step();
}
documentWriteInline();
<script>