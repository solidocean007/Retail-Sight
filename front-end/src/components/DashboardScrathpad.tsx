return (
  <>
    <DashboardHelmet />
    <Container
      sx={{ display: "flex", flexDirection: "column" }}
      className="dashboard-container"
    >
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={toggleDrawer(true)}
            >
              <MenuIcon open={Boolean(anchorEl)} />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Dashboard
            </Typography>
            <IconButton
              size="large"
              edge="start"
              color="success"
              aria-label="menu"
              sx={{ mr: 2 }}
            >
              <MenuIcon  open={Boolean(anchorEl)} />
            </IconButton>
          </Toolbar>
        </AppBar>
      </Box>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-top">
            <h1>Dashboard</h1>
            <IconButton
              size="large"
              edge="start"
              color="success"
              aria-label="menu"
              sx={{ mr: 2 }}
            >
              <Menu open={Boolean(anchorEl)} />
            </IconButton>
            <button
              className="home-btn"
              onClick={() => navigate("/user-home-page")}
            >
              Home
            </button>
          </div>
          {/* Top bar with user info and controls */}
          <div className="dashboard-user-details">
            <p>{`${user?.firstName} ${user?.lastName} Role: ${user?.role}`}</p>
          </div>
        </header>
        <button className="button-blue" onClick={toggleShowTeams}>
          <h4>{!showTeams ? "Teams" : " X "}</h4>
        </button>
        {showTeams && <TeamsViewer />}
        {/* Invite Form Section */}

        {(isAdmin || isDeveloper || isSuperAdmin) && (
          <section className="invite-section">
            <button className="button-blue" onClick={toggleInvites}>
              {showPendingInvites ? "Hide pending" : "Show Pending Invites"}
            </button>

            {showPendingInvites && (
              <div className="all-pending-invites">
                <form className="invite-form" onSubmit={handleInviteSubmit}>
                  <div className="invite-title">
                    <label htmlFor="inviteEmail">Invite Employee:</label>
                  </div>
                  <div className="invite-input-box">
                    <input
                      type="email"
                      id="inviteEmail"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Enter employee's email"
                      required
                    />
                    <button type="submit">Send Invite</button>
                  </div>
                </form>
                <PendingInvites />
              </div>
            )}
          </section>
        )}
        <section className="dashboard-content">
          <IconButton
            size="large"
            edge="start"
            color="success"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <Menu open={Boolean(anchorEl)} />
          </IconButton>
          <button className="button-blue" onClick={toggleShowAllEmployees}>
            {showAllEmployees ? "Close employee list" : "Show Employees list"}
          </button>
          {showAllEmployees && (
            <div className="card role-management-card">
              <div className="header-and-all-info">
                <div className="table-header">
                  <div className="user-name-detail">Name</div>
                  <div className="user-detail">Email</div>
                  <div className="user-phone-detail">Phone Number</div>
                  <div className="user-role-detail">Role</div>
                </div>

                <div>
                  {localUsers.map((localUser) => (
                    <div className="all-user-info" key={localUser.uid}>
                      <div className="user-name-email">
                        <div className="user-name-detail">{`${localUser.firstName} ${localUser.lastName}`}</div>
                        <div className="user-detail">{localUser.email}</div>
                      </div>
                      <div className="user-phone-role">
                        <div className="user-phone-detail">
                          {localUser.phone}
                        </div>
                        <div className="user-role-detail">
                          {isSuperAdmin && localUser.uid !== user?.uid ? (
                            <select
                              title="role-select"
                              value={localUser.role}
                              onChange={(e) =>
                                handleRoleChange(
                                  localUser.uid!,
                                  e.target.value
                                )
                              }
                            >
                              {/* List all possible roles here */}
                              <option value="admin">Admin</option>
                              <option value="employee">Employee</option>
                              {/* Other roles */}
                            </select>
                          ) : (
                            <span>{localUser.role}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Additional cards for other dashboard content */}
        </section>
      </main>
    </Container>
   
  </>
);