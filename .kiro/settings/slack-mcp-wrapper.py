import ssl
# Monkey-patch SSL to skip verification for corporate proxy environments
ssl._create_default_https_context = ssl._create_unverified_context

# Now import and run the actual MCP server
from mcp_slack import main
main()
